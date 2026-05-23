import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { RewardEligibility } from "@prisma/client";
import { NotificationType, RewardRedemptionStatus } from "@prisma/client";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { RewardsRepository } from "./rewards.repository";
import { CreateRewardDto } from "./dto/create-reward.dto";
import { UpdateRewardDto } from "./dto/update-reward.dto";
import { RedeemRewardDto } from "./dto/redeem-reward.dto";
import { ResolveRedemptionDto } from "./dto/resolve-redemption.dto";
import { OperatorRewardDto } from "./dto/import-operator-rewards.dto";

@Injectable()
export class RewardsService {
  constructor(private readonly repository: RewardsRepository) {}

  // ── Catalogue ───────────────────────────────────────────────────────────────

  async getRewards(user: AuthenticatedUser) {
    const enabledOnly = user.role === "child";
    return this.repository.getRewardsForHousehold(user.householdId, enabledOnly, user.role);
  }

  async createReward(dto: CreateRewardDto, user: AuthenticatedUser) {
    return this.repository.createReward(user.householdId, dto);
  }

  async updateReward(rewardId: string, dto: UpdateRewardDto, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: "reward_not_found", message: "Reward not found." });
    }
    if (reward.isOperatorManaged) {
      throw new ForbiddenException({
        code: "operator_managed_reward",
        message: "This reward is managed by the operator and cannot be edited."
      });
    }
    return this.repository.updateReward(rewardId, user.householdId, dto);
  }

  async toggleReward(rewardId: string, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: "reward_not_found", message: "Reward not found." });
    }
    return this.repository.toggleReward(rewardId, user.householdId, !reward.isEnabled);
  }

  async deleteReward(rewardId: string, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: "reward_not_found", message: "Reward not found." });
    }
    if (reward.isOperatorManaged) {
      throw new ForbiddenException({
        code: "operator_managed_reward",
        message: "This reward is managed by the operator and cannot be deleted. You can disable it instead."
      });
    }
    return this.repository.deleteReward(rewardId, user.householdId);
  }

  // ── Redemption ──────────────────────────────────────────────────────────────

  async redeemReward(rewardId: string, _dto: RedeemRewardDto, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: "reward_not_found", message: "Reward not found." });
    }
    if (!reward.isEnabled) {
      throw new BadRequestException({ code: "reward_not_enabled", message: "This reward is not currently available." });
    }

    const isAdult = user.role !== "child";
    if (reward.eligibility === RewardEligibility.ADULT_ONLY && !isAdult) {
      throw new ForbiddenException({ code: "reward_adults_only", message: "This reward is only available to parents and admins." });
    }
    if (reward.eligibility === RewardEligibility.CHILD_ONLY && isAdult) {
      throw new ForbiddenException({ code: "reward_children_only", message: "This reward is only available to children." });
    }

    if (user.points < reward.pointCost) {
      throw new BadRequestException({
        code: "insufficient_points",
        message: `You need ${reward.pointCost} points but only have ${user.points}.`
      });
    }

    // Check per-child redemption limit
    if (reward.maxRedemptionsPerChild != null) {
      const count = await this.repository.countChildRedemptions(rewardId, user.id);
      if (count >= reward.maxRedemptionsPerChild) {
        throw new BadRequestException({
          code: "redemption_limit_reached",
          message: "You have reached the maximum number of redemptions for this reward."
        });
      }
    }

    // Check cooldown
    if (reward.cooldownDays != null && reward.cooldownDays > 0) {
      const last = await this.repository.getLastApprovedRedemption(rewardId, user.id);
      if (last?.resolvedAtUtc) {
        const cooldownMs = reward.cooldownDays * 24 * 60 * 60 * 1000;
        const elapsed = Date.now() - last.resolvedAtUtc.getTime();
        if (elapsed < cooldownMs) {
          const remainingDays = Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000));
          throw new BadRequestException({
            code: "reward_on_cooldown",
            message: `You can redeem this reward again in ${remainingDays} day(s).`
          });
        }
      }
    }

    const household = await this.repository.getHouseholdByTenantId(
      await this.repository.getTenantIdForHousehold(user.householdId)
    );
    const autoApprove = !(household?.settings?.requireRewardApproval ?? true);
    const tenantId = await this.repository.getTenantIdForHousehold(user.householdId);

    const redemption = await this.repository.createRedemption({
      rewardId,
      householdId: user.householdId,
      tenantId,
      requestedById: user.id,
      pointsDeducted: reward.pointCost,
      autoApprove
    });

    if (!autoApprove) {
      await this.repository.notifyAdminsAndParents(
        user.householdId,
        NotificationType.REWARD_REDEMPTION_REQUESTED,
        "Reward redemption requested",
        `${user.displayName} wants to redeem "${reward.title}" for ${reward.pointCost} points.`,
        redemption.id
      );
    }

    return redemption;
  }

  async getRedemptions(user: AuthenticatedUser) {
    if (user.role === "child") {
      return this.repository.getRedemptionsForHousehold(user.householdId, user.id);
    }
    return this.repository.getRedemptionsForHousehold(user.householdId, undefined, RewardRedemptionStatus.PENDING);
  }

  async resolveRedemption(redemptionId: string, dto: ResolveRedemptionDto, user: AuthenticatedUser) {
    const redemption = await this.repository.getRedemptionById(redemptionId, user.householdId);
    if (!redemption) {
      throw new NotFoundException({ code: "redemption_not_found", message: "Redemption not found." });
    }
    if (redemption.status !== RewardRedemptionStatus.PENDING) {
      throw new BadRequestException({ code: "redemption_already_resolved", message: "This redemption has already been resolved." });
    }

    const tenantId = await this.repository.getTenantIdForHousehold(user.householdId);

    const resolved = await this.repository.resolveRedemption({
      redemptionId,
      householdId: user.householdId,
      tenantId,
      resolvedById: user.id,
      approved: dto.approved,
      adminNote: dto.note,
      pointsDeducted: redemption.pointsDeducted,
      requestedById: redemption.requestedById,
      rewardTitle: redemption.reward.title
    });

    const notifType = dto.approved
      ? NotificationType.REWARD_REDEMPTION_APPROVED
      : NotificationType.REWARD_REDEMPTION_REJECTED;
    const notifTitle = dto.approved ? "Reward approved!" : "Reward request declined";
    const notifMessage = dto.approved
      ? `Your request for "${redemption.reward.title}" was approved. ${redemption.pointsDeducted} points deducted.`
      : `Your request for "${redemption.reward.title}" was declined.${dto.note ? ` Note: ${dto.note}` : ""}`;

    await this.repository.notifyUser(
      redemption.requestedById,
      user.householdId,
      tenantId,
      notifType,
      notifTitle,
      notifMessage,
      redemptionId
    );

    return resolved;
  }

  // ── Operator import ──────────────────────────────────────────────────────────

  async importOperatorRewards(householdId: string, rewards: OperatorRewardDto[], locale: SupportedLanguage) {
    return this.repository.importOperatorRewards(householdId, rewards, locale);
  }
}
