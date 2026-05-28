import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationDeviceProvider,
  NotificationEmailDeliveryStatus,
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

export type UpcomingClaim = {
  redemptionId: string;
  userId: string;
  displayName: string;
  targetDate: string; // 'YYYY-MM-DD'
};

/** Format a Date (or DATE-type value from Prisma) as a 'YYYY-MM-DD' string in UTC. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a 'YYYY-MM-DD' string into a UTC midnight Date for Prisma DATE comparisons. */
function parseDateString(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

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
      return rewards.map((r) => ({ ...r, upcomingClaims: [] as UpcomingClaim[] }));
    }

    // Fetch all approved bookings for exclusive rewards with targetDate >= today.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const approvedClaims = await this.prisma.rewardRedemption.findMany({
      where: {
        rewardId: { in: exclusiveIds },
        householdId,
        status: RewardRedemptionStatus.APPROVED,
        targetDate: { gte: todayStart },
      },
      include: { requestedBy: { select: { id: true, displayName: true } } },
      orderBy: { targetDate: 'asc' },
    });

    // Group by rewardId; each reward gets its list of upcoming bookings.
    const claimsByReward = new Map<string, UpcomingClaim[]>();
    for (const claim of approvedClaims) {
      if (!claim.targetDate) continue;
      const list = claimsByReward.get(claim.rewardId) ?? [];
      list.push({
        redemptionId: claim.id,
        userId: claim.requestedById,
        displayName: claim.requestedBy.displayName,
        targetDate: toDateString(claim.targetDate),
      });
      claimsByReward.set(claim.rewardId, list);
    }

    return rewards.map((r) => ({ ...r, upcomingClaims: claimsByReward.get(r.id) ?? [] }));
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
    targetDate?: string; // 'YYYY-MM-DD' for DAILY_EXCLUSIVE
  }) {
    const targetDate = input.targetDate ? parseDateString(input.targetDate) : null;

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
            ...(targetDate && { targetDate }),
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
        ...(targetDate && { targetDate }),
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

  /**
   * Reschedule a DAILY_EXCLUSIVE booking to a new target date.
   *
   * - PENDING → just update targetDate (no new approval needed); checks for conflicts.
   * - APPROVED → cancel with full point refund, create a fresh PENDING redemption
   *   for the new date (triggers a new approval flow).
   *
   * Returns the updated/created redemption and whether a new approval is pending.
   */
  async rescheduleRedemption(input: {
    redemptionId: string;
    householdId: string;
    tenantId: string;
    newTargetDate: string; // 'YYYY-MM-DD'
    requestedById: string;
    actorUserId: string; // may differ from requestedById when admin reschedules
  }) {
    const newDate = parseDateString(input.newTargetDate);

    const existing = await this.prisma.rewardRedemption.findFirst({
      where: { id: input.redemptionId, householdId: input.householdId },
      include: { reward: true },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'redemption_not_found', message: 'Redemption not found.' });
    }

    // Check no other APPROVED booking already exists for the new date (excluding current).
    const conflict = await this.getRedemptionForDate(existing.rewardId, input.householdId, input.newTargetDate);
    if (conflict && conflict.id !== input.redemptionId) {
      return { conflict: true, conflictOwner: conflict.requestedBy.displayName, redemption: null, needsApproval: false };
    }

    if (existing.status === RewardRedemptionStatus.PENDING) {
      const updated = await this.prisma.rewardRedemption.update({
        where: { id: input.redemptionId },
        data: { targetDate: newDate },
        include: { reward: true, requestedBy: true },
      });
      return { conflict: false, conflictOwner: null, redemption: updated, needsApproval: true };
    }

    if (existing.status === RewardRedemptionStatus.APPROVED) {
      const newRedemption = await this.prisma.$transaction(async (tx) => {
        // Cancel the current approved booking.
        await tx.rewardRedemption.update({
          where: { id: input.redemptionId },
          data: {
            status: RewardRedemptionStatus.CANCELLED,
            adminNote: `Rescheduled to ${input.newTargetDate} by ${input.actorUserId === input.requestedById ? 'the claimer' : 'an admin'}.`,
          },
        });
        // Refund the points.
        await tx.user.update({
          where: { id: existing.requestedById },
          data: { points: { increment: existing.pointsDeducted } },
        });
        await tx.pointsLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            userId: existing.requestedById,
            amount: existing.pointsDeducted,
            reason: `Refund — rescheduled "${existing.reward.title}" to ${input.newTargetDate}`,
          },
        });
        // Create fresh PENDING redemption for the new date.
        return tx.rewardRedemption.create({
          data: {
            rewardId: existing.rewardId,
            householdId: input.householdId,
            tenantId: input.tenantId,
            requestedById: existing.requestedById,
            pointsDeducted: existing.pointsDeducted,
            status: RewardRedemptionStatus.PENDING,
            targetDate: newDate,
          },
          include: { reward: true, requestedBy: true },
        });
      });
      return { conflict: false, conflictOwner: null, redemption: newRedemption, needsApproval: true };
    }

    throw new NotFoundException({ code: 'redemption_not_reschedulable', message: 'Only PENDING or APPROVED redemptions can be rescheduled.' });
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

  /**
   * Returns the first APPROVED redemption for this reward on the given target date
   * across the entire household (not per-user). Used for the DAILY_EXCLUSIVE gate.
   */
  async getRedemptionForDate(rewardId: string, householdId: string, targetDateStr: string) {
    const dateStart = parseDateString(targetDateStr);
    const dateEnd = new Date(dateStart);
    dateEnd.setUTCHours(23, 59, 59, 999);
    return this.prisma.rewardRedemption.findFirst({
      where: {
        rewardId,
        householdId,
        status: RewardRedemptionStatus.APPROVED,
        targetDate: { gte: dateStart, lte: dateEnd },
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
      await this.enqueuePushNotification(recipient.tenantId, householdId, recipient.id, type, title, message, entityId);
    }
  }

  async notifyAllHousehold(
    householdId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId: string,
  ) {
    const members = await this.prisma.user.findMany({
      where: { householdId },
      select: { id: true, tenantId: true },
    });
    for (const member of members) {
      await this.enqueuePushNotification(member.tenantId, householdId, member.id, type, title, message, entityId);
    }
  }

  private async enqueuePushNotification(
    tenantId: string,
    householdId: string,
    recipientUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        householdId,
        recipientUserId,
        type,
        title,
        message,
        entityType: 'rewardRedemption',
        entityId,
        emailDeliveryStatus: NotificationEmailDeliveryStatus.SKIPPED,
        isRead: false,
      },
    });

    const devices = await this.prisma.notificationDevice.findMany({
      where: {
        tenantId,
        userId: recipientUserId,
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

  // ── Day-of booking reminders ────────────────────────────────────────────────

  /**
   * Called by the reminder worker each interval. Finds all DAILY_EXCLUSIVE
   * approved bookings whose targetDate is today (UTC) and fires a
   * REWARD_BOOKING_REMINDER push to every household member.
   * Idempotent — skips bookings that already have a reminder notification today.
   */
  async processRewardBookingReminders(options: {
    now: Date;
    tenantIds?: string[];
  }): Promise<{ createdCount: number }> {
    const todayStr = toDateString(options.now);
    const todayStart = parseDateString(todayStr);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const bookings = await this.prisma.rewardRedemption.findMany({
      where: {
        status: RewardRedemptionStatus.APPROVED,
        targetDate: { gte: todayStart, lte: todayEnd },
        reward: { workflowType: RewardWorkflowType.DAILY_EXCLUSIVE },
        ...(options.tenantIds?.length ? { tenantId: { in: options.tenantIds } } : {}),
      },
      include: {
        reward: { select: { title: true } },
        requestedBy: { select: { id: true, displayName: true } },
        household: { select: { id: true } },
      },
    });

    let createdCount = 0;

    for (const booking of bookings) {
      // Idempotency: skip if a reminder was already sent for this booking today.
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          entityType: 'reward_booking_reminder',
          entityId: booking.id,
          createdAtUtc: { gte: todayStart, lte: todayEnd },
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      const members = await this.prisma.user.findMany({
        where: { householdId: booking.household.id },
        select: { id: true, tenantId: true },
      });

      for (const member of members) {
        const isOwner = member.id === booking.requestedById;
        const msgBody = isOwner
          ? `Your "${booking.reward.title}" reward is today — enjoy it!`
          : `${booking.requestedBy.displayName}'s "${booking.reward.title}" reward is today.`;

        const notification = await this.prisma.notification.create({
          data: {
            tenantId: member.tenantId,
            householdId: booking.household.id,
            recipientUserId: member.id,
            type: NotificationType.REWARD_BOOKING_REMINDER,
            title: 'Reward today',
            message: msgBody,
            entityType: 'reward_booking_reminder',
            entityId: booking.id,
            emailDeliveryStatus: NotificationEmailDeliveryStatus.SKIPPED,
            isRead: false,
          },
        });

        const devices = await this.prisma.notificationDevice.findMany({
          where: {
            tenantId: member.tenantId,
            userId: member.id,
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

        createdCount++;
      }
    }

    return { createdCount };
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
