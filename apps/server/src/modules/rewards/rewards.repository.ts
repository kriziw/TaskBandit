import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationDeviceProvider,
  NotificationPushDeliveryStatus,
  NotificationType,
  Prisma,
  RewardRedemptionStatus,
  RewardWorkflowType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupportedLanguage } from '../../common/i18n/supported-languages';
import { StarterRewardDefinition } from '../bootstrap/starter-rewards.catalog';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { OperatorRewardDto } from './dto/import-operator-rewards.dto';

@Injectable()
export class RewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reward CRUD ─────────────────────────────────────────────────────────────

  async getRewardsForHousehold(householdId: string, enabledOnly: boolean) {
    const rewards = await this.prisma.reward.findMany({
      where: { householdId, ...(enabledOnly ? { isEnabled: true } : {}) },
      orderBy: [{ category: 'asc' }, { pointCost: 'asc' }],
    });

    const exclusiveIds = rewards
      .filter((r) => r.workflowType === RewardWorkflowType.DAILY_EXCLUSIVE)
      .map((r) => r.id);

    if (exclusiveIds.length === 0) {
      return rewards.map((r) => ({ ...r, claimedTodayBy: null }));
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const todayClaims = await this.prisma.rewardRedemption.findMany({
      where: {
        rewardId: { in: exclusiveIds },
        householdId,
        status: RewardRedemptionStatus.APPROVED,
        resolvedAtUtc: { gte: todayStart, lte: todayEnd },
      },
      include: { requestedBy: { select: { id: true, displayName: true } } },
      orderBy: { resolvedAtUtc: 'asc' },
    });

    const claimMap = new Map<string, { userId: string; displayName: string }>();
    for (const claim of todayClaims) {
      if (!claimMap.has(claim.rewardId)) {
        claimMap.set(claim.rewardId, {
          userId: claim.requestedById,
          displayName: claim.requestedBy.displayName,
        });
      }
    }

    return rewards.map((r) => ({ ...r, claimedTodayBy: claimMap.get(r.id) ?? null }));
  }

  async getRewardById(rewardId: string, householdId: string) {
    return this.prisma.reward.findFirst({ where: { id: rewardId, householdId } });
  }

  async createReward(householdId: string, dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        householdId,
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        eligibility: dto.eligibility ?? 'ALL',
        icon: dto.icon ?? null,
        pointCost: dto.pointCost,
        maxRedemptionsPerChild: dto.maxRedemptionsPerChild ?? null,
        cooldownDays: dto.cooldownDays ?? null,
        workflowType: dto.workflowType ?? RewardWorkflowType.STANDARD,
        isEnabled: false,
      },
    });
  }

  async updateReward(rewardId: string, householdId: string, dto: UpdateRewardDto) {
    return this.prisma.reward.update({
      where: { id: rewardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.eligibility !== undefined && { eligibility: dto.eligibility }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.pointCost !== undefined && { pointCost: dto.pointCost }),
        ...(dto.maxRedemptionsPerChild !== undefined && {
          maxRedemptionsPerChild: dto.maxRedemptionsPerChild,
        }),
        ...(dto.cooldownDays !== undefined && { cooldownDays: dto.cooldownDays }),
        ...(dto.workflowType !== undefined && { workflowType: dto.workflowType }),
      },
    });
  }

  async toggleReward(rewardId: string, householdId: string, isEnabled: boolean) {
    return this.prisma.reward.update({
      where: { id: rewardId },
      data: { isEnabled },
    });
  }

  async deleteReward(rewardId: string, householdId: string) {
    return this.prisma.reward.delete({ where: { id: rewardId } });
  }

  // ── Redemption flow ─────────────────────────────────────────────────────────

  async createRedemption(input: {
    rewardId: string;
    householdId: string;
    tenantId: string;
    requestedById: string;
    pointsDeducted: number;
    autoApprove: boolean;
  }) {
    if (input.autoApprove) {
      return this.prisma.$transaction(async (tx) => {
        const redemption = await tx.rewardRedemption.create({
          data: {
            rewardId: input.rewardId,
            householdId: input.householdId,
            tenantId: input.tenantId,
            requestedById: input.requestedById,
            pointsDeducted: input.pointsDeducted,
            status: RewardRedemptionStatus.APPROVED,
            resolvedAtUtc: new Date(),
            resolvedById: input.requestedById,
          },
          include: { reward: true, requestedBy: true },
        });
        await tx.user.update({
          where: { id: input.requestedById },
          data: { points: { decrement: input.pointsDeducted } },
        });
        await tx.pointsLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            userId: input.requestedById,
            amount: -input.pointsDeducted,
            reason: `Reward redeemed: ${redemption.reward.title}`,
          },
        });
        return redemption;
      });
    }

    return this.prisma.rewardRedemption.create({
      data: {
        rewardId: input.rewardId,
        householdId: input.householdId,
        tenantId: input.tenantId,
        requestedById: input.requestedById,
        pointsDeducted: input.pointsDeducted,
        status: RewardRedemptionStatus.PENDING,
      },
      include: { reward: true, requestedBy: true },
    });
  }

  async getRedemptionsForHousehold(
    householdId: string,
    userId?: string,
    statusFilter?: RewardRedemptionStatus,
  ) {
    return this.prisma.rewardRedemption.findMany({
      where: {
        householdId,
        ...(userId ? { requestedById: userId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        reward: true,
        requestedBy: { select: { id: true, displayName: true, role: true } },
        resolvedBy: { select: { id: true, displayName: true, role: true } },
      },
      orderBy: { requestedAtUtc: 'desc' },
    });
  }

  async getRedemptionById(redemptionId: string, householdId: string) {
    return this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, householdId },
      include: {
        reward: true,
        requestedBy: { select: { id: true, displayName: true, role: true } },
        resolvedBy: { select: { id: true, displayName: true, role: true } },
      },
    });
  }

  async resolveRedemption(input: {
    redemptionId: string;
    householdId: string;
    tenantId: string;
    resolvedById: string;
    approved: boolean;
    adminNote?: string;
    pointsDeducted: number;
    requestedById: string;
    rewardTitle: string;
  }) {
    if (input.approved) {
      return this.prisma.$transaction(async (tx) => {
        const redemption = await tx.rewardRedemption.update({
          where: { id: input.redemptionId },
          data: {
            status: RewardRedemptionStatus.APPROVED,
            resolvedAtUtc: new Date(),
            resolvedById: input.resolvedById,
            adminNote: input.adminNote ?? null,
          },
          include: { reward: true, requestedBy: true },
        });
        await tx.user.update({
          where: { id: input.requestedById },
          data: { points: { decrement: input.pointsDeducted } },
        });
        await tx.pointsLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            userId: input.requestedById,
            amount: -input.pointsDeducted,
            reason: `Reward redeemed: ${input.rewardTitle}`,
          },
        });
        return redemption;
      });
    }

    return this.prisma.rewardRedemption.update({
      where: { id: input.redemptionId },
      data: {
        status: RewardRedemptionStatus.REJECTED,
        resolvedAtUtc: new Date(),
        resolvedById: input.resolvedById,
        adminNote: input.adminNote ?? null,
      },
      include: { reward: true, requestedBy: true },
    });
  }

  async countChildRedemptions(rewardId: string, userId: string): Promise<number> {
    return this.prisma.rewardRedemption.count({
      where: {
        rewardId,
        requestedById: userId,
        status: { in: [RewardRedemptionStatus.APPROVED] },
      },
    });
  }

  async getLastApprovedRedemption(rewardId: string, userId: string) {
    return this.prisma.rewardRedemption.findFirst({
      where: { rewardId, requestedById: userId, status: RewardRedemptionStatus.APPROVED },
      orderBy: { resolvedAtUtc: 'desc' },
    });
  }

  async getHouseholdRedemptionToday(rewardId: string, householdId: string) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);
    return this.prisma.rewardRedemption.findFirst({
      where: {
        rewardId,
        householdId,
        status: RewardRedemptionStatus.APPROVED,
        resolvedAtUtc: { gte: todayStart, lte: todayEnd },
      },
      include: { requestedBy: { select: { id: true, displayName: true } } },
    });
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  async notifyAdminsAndParents(
    householdId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId: string,
  ) {
    const recipients = await this.prisma.user.findMany({
      where: { householdId, role: { in: ['ADMIN', 'PARENT'] } },
    });
    for (const recipient of recipients) {
      await this.prisma.notification.create({
        data: {
          tenantId: recipient.tenantId,
          householdId,
          recipientUserId: recipient.id,
          type,
          title,
          message,
          entityType: 'rewardRedemption',
          entityId,
          isRead: false,
        },
      });
    }
  }

  async notifyUser(
    userId: string,
    householdId: string,
    tenantId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId: string,
  ) {
    await this.prisma.notification.create({
      data: {
        tenantId,
        householdId,
        recipientUserId: userId,
        type,
        title,
        message,
        entityType: 'rewardRedemption',
        entityId,
        isRead: false,
      },
    });
  }

  async notifyHouseholdExcept(
    householdId: string,
    excludeUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId: string,
  ) {
    const recipients = await this.prisma.user.findMany({
      where: { householdId, id: { not: excludeUserId } },
      select: { id: true, tenantId: true },
    });

    for (const recipient of recipients) {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId: recipient.tenantId,
          householdId,
          recipientUserId: recipient.id,
          type,
          title,
          message,
          entityType: 'rewardRedemption',
          entityId,
          isRead: false,
        },
      });

      const devices = await this.prisma.notificationDevice.findMany({
        where: {
          tenantId: recipient.tenantId,
          userId: recipient.id,
          notificationsEnabled: true,
          OR: [
            { provider: NotificationDeviceProvider.FCM, pushToken: { not: null } },
            {
              provider: NotificationDeviceProvider.WEB_PUSH,
              pushToken: { not: null },
              webPushP256dh: { not: null },
              webPushAuth: { not: null },
            },
          ],
        },
      });

      if (devices.length > 0) {
        await this.prisma.notificationPushDelivery.createMany({
          data: devices.map((device) => ({
            tenantId: device.tenantId,
            notificationId: notification.id,
            notificationDeviceId: device.id,
            status: NotificationPushDeliveryStatus.PENDING,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  // ── Seeding ─────────────────────────────────────────────────────────────────

  async seedStarterRewards(
    householdId: string,
    definitions: StarterRewardDefinition[],
    locale: SupportedLanguage,
  ) {
    for (const def of definitions) {
      await this.prisma.reward.upsert({
        where: {
          householdId_catalogKey: { householdId, catalogKey: def.key },
        },
        create: {
          householdId,
          catalogKey: def.key,
          isEnabled: false,
          defaultLocale: locale,
          title: def.title[locale] ?? def.title['en'],
          titleTranslations: def.title as unknown as Prisma.InputJsonValue,
          description: def.description[locale] ?? def.description['en'] ?? null,
          descriptionTranslations: def.description as unknown as Prisma.InputJsonValue,
          category: def.category,
          eligibility: def.eligibility ?? 'ALL',
          icon: def.icon ?? null,
          pointCost: def.pointCost,
          maxRedemptionsPerChild: def.maxRedemptionsPerChild ?? null,
          cooldownDays: def.cooldownDays ?? null,
          workflowType: def.workflowType ?? RewardWorkflowType.STANDARD,
        },
        update: {},
      });
    }
  }

  // ── Operator import ──────────────────────────────────────────────────────────

  async importOperatorRewards(
    householdId: string,
    rewards: OperatorRewardDto[],
    locale: SupportedLanguage,
  ) {
    let upserted = 0;
    for (const dto of rewards) {
      await this.prisma.reward.upsert({
        where: {
          householdId_catalogKey: { householdId, catalogKey: dto.key },
        },
        create: {
          householdId,
          catalogKey: dto.key,
          isOperatorManaged: true,
          isEnabled: false,
          defaultLocale: locale,
          title: dto.title[locale] ?? dto.title.en,
          titleTranslations: dto.title as unknown as Prisma.InputJsonValue,
          description: dto.description
            ? (dto.description[locale] ?? dto.description.en ?? null)
            : null,
          descriptionTranslations: dto.description
            ? (dto.description as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          category: dto.category,
          icon: dto.icon ?? null,
          pointCost: dto.pointCost,
          maxRedemptionsPerChild: dto.maxRedemptionsPerChild ?? null,
          cooldownDays: dto.cooldownDays ?? null,
        },
        update: {
          isOperatorManaged: true,
          title: dto.title[locale] ?? dto.title.en,
          titleTranslations: dto.title as unknown as Prisma.InputJsonValue,
          description: dto.description
            ? (dto.description[locale] ?? dto.description.en ?? null)
            : null,
          descriptionTranslations: dto.description
            ? (dto.description as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          category: dto.category,
          icon: dto.icon ?? null,
          pointCost: dto.pointCost,
          maxRedemptionsPerChild: dto.maxRedemptionsPerChild ?? null,
          cooldownDays: dto.cooldownDays ?? null,
        },
      });
      upserted++;
    }
    return { upserted };
  }

  async getTenantIdForHousehold(householdId: string): Promise<string> {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { tenantId: true },
    });
    if (!household) {
      throw new NotFoundException({ code: 'household_not_found', message: 'Household not found.' });
    }
    return household.tenantId;
  }

  async getHouseholdByTenantId(tenantId: string) {
    return this.prisma.household.findUnique({
      where: { tenantId },
      include: { settings: true },
    });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
