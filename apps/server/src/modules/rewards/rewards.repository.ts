import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma, RewardRedemptionStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { StarterRewardDefinition } from "../bootstrap/starter-rewards.catalog";
import { CreateRewardDto } from "./dto/create-reward.dto";
import { UpdateRewardDto } from "./dto/update-reward.dto";
import { OperatorRewardDto } from "./dto/import-operator-rewards.dto";

@Injectable()
export class RewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reward CRUD ─────────────────────────────────────────────────────────────

  async getRewardsForHousehold(householdId: string, enabledOnly: boolean, role?: string) {
    const eligibilityFilter =
      role === "child"
        ? { eligibility: { in: ["CHILD_ONLY" as const, "ALL" as const] } }
        : role !== "child" && enabledOnly
          ? { eligibility: { in: ["ALL" as const, "ADULT_ONLY" as const] } }
          : {};
    return this.prisma.reward.findMany({
      where: {
        householdId,
        ...(enabledOnly ? { isEnabled: true } : {}),
        ...eligibilityFilter
      },
      orderBy: [{ category: "asc" }, { pointCost: "asc" }]
    });
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
        eligibility: dto.eligibility ?? "ALL",
        icon: dto.icon ?? null,
        pointCost: dto.pointCost,
        maxRedemptionsPerChild: dto.maxRedemptionsPerChild ?? null,
        cooldownDays: dto.cooldownDays ?? null,
        isEnabled: false
      }
    });
  }

  async updateReward(rewardId: string, householdId: string, dto: UpdateRewardDto) {
    return this.prisma.reward.update({
      where: { id: rewardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.pointCost !== undefined && { pointCost: dto.pointCost }),
        ...(dto.eligibility !== undefined && { eligibility: dto.eligibility }),
        ...(dto.maxRedemptionsPerChild !== undefined && { maxRedemptionsPerChild: dto.maxRedemptionsPerChild }),
        ...(dto.cooldownDays !== undefined && { cooldownDays: dto.cooldownDays })
      }
    });
  }

  async toggleReward(rewardId: string, householdId: string, isEnabled: boolean) {
    return this.prisma.reward.update({
      where: { id: rewardId },
      data: { isEnabled }
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
            resolvedById: input.requestedById
          },
          include: { reward: true, requestedBy: true }
        });
        await tx.user.update({
          where: { id: input.requestedById },
          data: { points: { decrement: input.pointsDeducted } }
        });
        await tx.pointsLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            userId: input.requestedById,
            amount: -input.pointsDeducted,
            reason: `Reward redeemed: ${redemption.reward.title}`
          }
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
        status: RewardRedemptionStatus.PENDING
      },
      include: { reward: true, requestedBy: true }
    });
  }

  async getRedemptionsForHousehold(householdId: string, userId?: string, statusFilter?: RewardRedemptionStatus) {
    return this.prisma.rewardRedemption.findMany({
      where: {
        householdId,
        ...(userId ? { requestedById: userId } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      },
      include: {
        reward: true,
        requestedBy: { select: { id: true, displayName: true, role: true } },
        resolvedBy: { select: { id: true, displayName: true, role: true } }
      },
      orderBy: { requestedAtUtc: "desc" }
    });
  }

  async getRedemptionById(redemptionId: string, householdId: string) {
    return this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, householdId },
      include: {
        reward: true,
        requestedBy: { select: { id: true, displayName: true, role: true } },
        resolvedBy: { select: { id: true, displayName: true, role: true } }
      }
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
            adminNote: input.adminNote ?? null
          },
          include: { reward: true, requestedBy: true }
        });
        await tx.user.update({
          where: { id: input.requestedById },
          data: { points: { decrement: input.pointsDeducted } }
        });
        await tx.pointsLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            userId: input.requestedById,
            amount: -input.pointsDeducted,
            reason: `Reward redeemed: ${input.rewardTitle}`
          }
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
        adminNote: input.adminNote ?? null
      },
      include: { reward: true, requestedBy: true }
    });
  }

  async countChildRedemptions(rewardId: string, userId: string): Promise<number> {
    return this.prisma.rewardRedemption.count({
      where: {
        rewardId,
        requestedById: userId,
        status: { in: [RewardRedemptionStatus.APPROVED] }
      }
    });
  }

  async getLastApprovedRedemption(rewardId: string, userId: string) {
    return this.prisma.rewardRedemption.findFirst({
      where: { rewardId, requestedById: userId, status: RewardRedemptionStatus.APPROVED },
      orderBy: { resolvedAtUtc: "desc" }
    });
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  async notifyAdminsAndParents(
    householdId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId: string
  ) {
    const recipients = await this.prisma.user.findMany({
      where: { householdId, role: { in: ["ADMIN", "PARENT"] } }
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
          entityType: "rewardRedemption",
          entityId,
          isRead: false
        }
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
    entityId: string
  ) {
    await this.prisma.notification.create({
      data: {
        tenantId,
        householdId,
        recipientUserId: userId,
        type,
        title,
        message,
        entityType: "rewardRedemption",
        entityId,
        isRead: false
      }
    });
  }

  // ── Seeding ─────────────────────────────────────────────────────────────────

  async seedStarterRewards(
    householdId: string,
    definitions: StarterRewardDefinition[],
    locale: SupportedLanguage
  ) {
    for (const def of definitions) {
      await this.prisma.reward.upsert({
        where: {
          householdId_catalogKey: { householdId, catalogKey: def.key }
        },
        create: {
          householdId,
          catalogKey: def.key,
          isEnabled: false,
          defaultLocale: locale,
          title: def.title[locale] ?? def.title["en"],
          titleTranslations: def.title as unknown as Prisma.InputJsonValue,
          description: def.description[locale] ?? def.description["en"] ?? null,
          descriptionTranslations: def.description as unknown as Prisma.InputJsonValue,
          category: def.category,
          icon: def.icon ?? null,
          pointCost: def.pointCost,
          maxRedemptionsPerChild: def.maxRedemptionsPerChild ?? null,
          cooldownDays: def.cooldownDays ?? null
        },
        update: {}
      });
    }
  }

  // ── Operator import ──────────────────────────────────────────────────────────

  async importOperatorRewards(householdId: string, rewards: OperatorRewardDto[], locale: SupportedLanguage) {
    let upserted = 0;
    for (const dto of rewards) {
      await this.prisma.reward.upsert({
        where: {
          householdId_catalogKey: { householdId, catalogKey: dto.key }
        },
        create: {
          householdId,
          catalogKey: dto.key,
          isOperatorManaged: true,
          isEnabled: false,
          defaultLocale: locale,
          title: dto.title[locale] ?? dto.title.en,
          titleTranslations: dto.title as unknown as Prisma.InputJsonValue,
          description: dto.description ? (dto.description[locale] ?? dto.description.en ?? null) : null,
          descriptionTranslations: dto.description ? (dto.description as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          category: dto.category,
          eligibility: dto.eligibility ?? "ALL",
          icon: dto.icon ?? null,
          pointCost: dto.pointCost,
          maxRedemptionsPerChild: dto.maxRedemptionsPerChild ?? null,
          cooldownDays: dto.cooldownDays ?? null
        },
        update: {
          isOperatorManaged: true,
          title: dto.title[locale] ?? dto.title.en,
          titleTranslations: dto.title as unknown as Prisma.InputJsonValue,
          description: dto.description ? (dto.description[locale] ?? dto.description.en ?? null) : null,
          descriptionTranslations: dto.description ? (dto.description as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          category: dto.category,
          eligibility: dto.eligibility ?? "ALL",
          icon: dto.icon ?? null,
          pointCost: dto.pointCost,
          maxRedemptionsPerChild: dto.maxRedemptionsPerChild ?? null,
          cooldownDays: dto.cooldownDays ?? null
        }
      });
      upserted++;
    }
    return { upserted };
  }

  async getTenantIdForHousehold(householdId: string): Promise<string> {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { tenantId: true }
    });
    if (!household) {
      throw new NotFoundException({ code: "household_not_found", message: "Household not found." });
    }
    return household.tenantId;
  }

  async getHouseholdByTenantId(tenantId: string) {
    return this.prisma.household.findUnique({
      where: { tenantId },
      include: { settings: true }
    });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
