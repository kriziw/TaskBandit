import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, RewardRedemptionStatus, RewardWorkflowType } from '@prisma/client';
import { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { SupportedLanguage } from '../../common/i18n/supported-languages';
import { RewardsRepository } from './rewards.repository';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { ResolveRedemptionDto } from './dto/resolve-redemption.dto';
import { RescheduleRedemptionDto } from './dto/reschedule-redemption.dto';
import { OperatorRewardDto } from './dto/import-operator-rewards.dto';

/** Format a 'YYYY-MM-DD' date string for human-readable notifications. */
function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (dateStr === todayStr) return 'today';
  if (dateStr === tomorrowStr) return 'tomorrow';
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

@Injectable()
export class RewardsService {
  constructor(private readonly repository: RewardsRepository) {}

  // ── Catalogue ───────────────────────────────────────────────────────────────

  async getRewards(user: AuthenticatedUser) {
    const enabledOnly = user.role === 'child';
    return this.repository.getRewardsForHousehold(user.householdId, enabledOnly);
  }

  async createReward(dto: CreateRewardDto, user: AuthenticatedUser) {
    return this.repository.createReward(user.householdId, dto);
  }

  async updateReward(rewardId: string, dto: UpdateRewardDto, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: 'reward_not_found', message: 'Reward not found.' });
    }
    if (reward.isOperatorManaged) {
      throw new ForbiddenException({
        code: 'operator_managed_reward',
        message: 'This reward is managed by the operator and cannot be edited.',
      });
    }
    return this.repository.updateReward(rewardId, user.householdId, dto);
  }

  async toggleReward(rewardId: string, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: 'reward_not_found', message: 'Reward not found.' });
    }
    return this.repository.toggleReward(rewardId, user.householdId, !reward.isEnabled);
  }

  async deleteReward(rewardId: string, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: 'reward_not_found', message: 'Reward not found.' });
    }
    if (reward.isOperatorManaged) {
      throw new ForbiddenException({
        code: 'operator_managed_reward',
        message:
          'This reward is managed by the operator and cannot be deleted. You can disable it instead.',
      });
    }
    return this.repository.deleteReward(rewardId, user.householdId);
  }

  // ── Redemption ──────────────────────────────────────────────────────────────

  async redeemReward(rewardId: string, dto: RedeemRewardDto, user: AuthenticatedUser) {
    const reward = await this.repository.getRewardById(rewardId, user.householdId);
    if (!reward) {
      throw new NotFoundException({ code: 'reward_not_found', message: 'Reward not found.' });
    }
    if (!reward.isEnabled) {
      throw new BadRequestException({
        code: 'reward_not_enabled',
        message: 'This reward is not currently available.',
      });
    }
    if (user.points < reward.pointCost) {
      throw new BadRequestException({
        code: 'insufficient_points',
        message: `You need ${reward.pointCost} points but only have ${user.points}.`,
      });
    }

    // Check per-child redemption limit
    if (reward.maxRedemptionsPerChild != null) {
      const count = await this.repository.countChildRedemptions(rewardId, user.id);
      if (count >= reward.maxRedemptionsPerChild) {
        throw new BadRequestException({
          code: 'redemption_limit_reached',
          message: 'You have reached the maximum number of redemptions for this reward.',
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
            code: 'reward_on_cooldown',
            message: `You can redeem this reward again in ${remainingDays} day(s).`,
          });
        }
      }
    }

    // DAILY_EXCLUSIVE: require targetDate and check household-wide lock for that date
    let targetDate: string | undefined;
    if (reward.workflowType === RewardWorkflowType.DAILY_EXCLUSIVE) {
      if (!dto.targetDate) {
        throw new BadRequestException({
          code: 'target_date_required',
          message: 'Please choose a date to book this reward for.',
        });
      }
      targetDate = dto.targetDate;
      const existingClaim = await this.repository.getRedemptionForDate(
        rewardId,
        user.householdId,
        targetDate,
      );
      if (existingClaim) {
        const label = formatDateLabel(targetDate);
        throw new BadRequestException({
          code: 'reward_claimed_for_date',
          message: `This reward is already booked for ${label} by ${existingClaim.requestedBy.displayName}.`,
        });
      }
    }

    const household = await this.repository.getHouseholdByTenantId(
      await this.repository.getTenantIdForHousehold(user.householdId),
    );
    const autoApprove = !(household?.settings?.requireRewardApproval ?? true);
    const tenantId = await this.repository.getTenantIdForHousehold(user.householdId);

    const redemption = await this.repository.createRedemption({
      rewardId,
      householdId: user.householdId,
      tenantId,
      requestedById: user.id,
      pointsDeducted: reward.pointCost,
      autoApprove,
      targetDate,
    });

    if (!autoApprove) {
      const label = targetDate ? ` for ${formatDateLabel(targetDate)}` : '';
      await this.repository.notifyAdminsAndParents(
        user.householdId,
        NotificationType.REWARD_REDEMPTION_REQUESTED,
        'Reward redemption requested',
        `${user.displayName} wants to redeem "${reward.title}"${label} for ${reward.pointCost} points.`,
        redemption.id,
      );
    }

    // On auto-approve of an exclusive reward, broadcast to everyone else
    if (autoApprove && reward.workflowType === RewardWorkflowType.DAILY_EXCLUSIVE && targetDate) {
      const label = formatDateLabel(targetDate);
      await this.repository.notifyHouseholdExcept(
        user.householdId,
        user.id,
        NotificationType.REWARD_CLAIMED_EXCLUSIVE,
        'Reward booked!',
        `${user.displayName} booked "${reward.title}" for ${label}.`,
        redemption.id,
      );
    }

    return redemption;
  }

  async getRedemptions(user: AuthenticatedUser) {
    if (user.role === 'child') {
      return this.repository.getRedemptionsForHousehold(user.householdId, user.id);
    }
    return this.repository.getRedemptionsForHousehold(
      user.householdId,
      undefined,
      RewardRedemptionStatus.PENDING,
    );
  }

  async resolveRedemption(
    redemptionId: string,
    dto: ResolveRedemptionDto,
    user: AuthenticatedUser,
  ) {
    const redemption = await this.repository.getRedemptionById(redemptionId, user.householdId);
    if (!redemption) {
      throw new NotFoundException({
        code: 'redemption_not_found',
        message: 'Redemption not found.',
      });
    }
    if (redemption.status !== RewardRedemptionStatus.PENDING) {
      throw new BadRequestException({
        code: 'redemption_already_resolved',
        message: 'This redemption has already been resolved.',
      });
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
      rewardTitle: redemption.reward.title,
    });

    const notifType = dto.approved
      ? NotificationType.REWARD_REDEMPTION_APPROVED
      : NotificationType.REWARD_REDEMPTION_REJECTED;
    const notifTitle = dto.approved ? 'Reward approved!' : 'Reward request declined';
    const notifMessage = dto.approved
      ? `Your request for "${redemption.reward.title}" was approved. ${redemption.pointsDeducted} points deducted.`
      : `Your request for "${redemption.reward.title}" was declined.${dto.note ? ` Note: ${dto.note}` : ''}`;

    await this.repository.notifyUser(
      redemption.requestedById,
      user.householdId,
      tenantId,
      notifType,
      notifTitle,
      notifMessage,
      redemptionId,
    );

    // On admin approval of an exclusive reward, broadcast to all other household members
    if (dto.approved && redemption.reward.workflowType === RewardWorkflowType.DAILY_EXCLUSIVE) {
      const rawTargetDate = (redemption as typeof redemption & { targetDate?: Date | null })
        .targetDate;
      const label = rawTargetDate
        ? formatDateLabel(rawTargetDate.toISOString().slice(0, 10))
        : 'a date';
      await this.repository.notifyHouseholdExcept(
        user.householdId,
        redemption.requestedById,
        NotificationType.REWARD_CLAIMED_EXCLUSIVE,
        'Reward booked!',
        `${redemption.requestedBy.displayName} booked "${redemption.reward.title}" for ${label}.`,
        redemptionId,
      );
    }

    return resolved;
  }

  async rescheduleRedemption(
    redemptionId: string,
    dto: RescheduleRedemptionDto,
    user: AuthenticatedUser,
  ) {
    // Verify the redemption belongs to this household
    const redemption = await this.repository.getRedemptionById(redemptionId, user.householdId);
    if (!redemption) {
      throw new NotFoundException({
        code: 'redemption_not_found',
        message: 'Redemption not found.',
      });
    }

    // Only the original claimer or an admin/parent can reschedule
    const isOwner = redemption.requestedById === user.id;
    const isAdminOrParent = user.role === 'admin' || user.role === 'parent';
    if (!isOwner && !isAdminOrParent) {
      throw new ForbiddenException({
        code: 'not_your_redemption',
        message: 'You can only reschedule your own bookings.',
      });
    }

    const tenantId = await this.repository.getTenantIdForHousehold(user.householdId);
    const result = await this.repository.rescheduleRedemption({
      redemptionId,
      householdId: user.householdId,
      tenantId,
      newTargetDate: dto.targetDate,
      requestedById: redemption.requestedById,
      actorUserId: user.id,
    });

    if (result.conflict) {
      throw new BadRequestException({
        code: 'reward_claimed_for_date',
        message: `This reward is already booked for ${formatDateLabel(dto.targetDate)} by ${result.conflictOwner}.`,
      });
    }

    // If a new PENDING was created (rescheduled from APPROVED), notify admins
    if (result.needsApproval && result.redemption?.status === RewardRedemptionStatus.PENDING) {
      const label = formatDateLabel(dto.targetDate);
      await this.repository.notifyAdminsAndParents(
        user.householdId,
        NotificationType.REWARD_REDEMPTION_REQUESTED,
        'Reward rescheduled — needs approval',
        `${redemption.requestedBy.displayName} rescheduled "${redemption.reward.title}" to ${label}.`,
        result.redemption.id,
      );
    }

    return result.redemption;
  }

  // ── Operator import ──────────────────────────────────────────────────────────

  async importOperatorRewards(
    householdId: string,
    rewards: OperatorRewardDto[],
    locale: SupportedLanguage,
  ) {
    return this.repository.importOperatorRewards(householdId, rewards, locale);
  }
}
