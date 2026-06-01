import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface MasteryEvalResult {
  earned: boolean;
  newLevel: number;
  bonusPoints: number;
}

@Injectable()
export class MasteryService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateMasteryAfterApproval(input: {
    userId: string;
    householdId: string;
    tenantId: string;
    templateId: string;
    basePoints: number;
  }): Promise<MasteryEvalResult> {
    const template = await this.prisma.choreTemplate.findUnique({
      where: { id: input.templateId },
      select: {
        title: true,
        masteryDisabled: true,
        masteryLevel1Threshold: true,
        masteryLevel2Threshold: true,
        masteryLevel2BonusPercentage: true,
      },
    });

    if (!template || template.masteryDisabled) {
      return { earned: false, newLevel: 0, bonusPoints: 0 };
    }

    const stats = await this.prisma.userTemplateStats.upsert({
      where: {
        userId_templateId: { userId: input.userId, templateId: input.templateId },
      },
      create: {
        tenantId: input.tenantId,
        householdId: input.householdId,
        userId: input.userId,
        templateId: input.templateId,
        completionCount: 1,
        masteryLevel: 0,
      },
      update: {
        completionCount: { increment: 1 },
      },
    });

    const newCount = stats.completionCount;
    const currentLevel = stats.masteryLevel;

    let newLevel = currentLevel;
    if (currentLevel < 2 && newCount >= template.masteryLevel2Threshold) {
      newLevel = 2;
    } else if (currentLevel < 1 && newCount >= template.masteryLevel1Threshold) {
      newLevel = 1;
    }

    if (newLevel <= currentLevel) {
      return { earned: false, newLevel: currentLevel, bonusPoints: 0 };
    }

    const bonusPoints =
      newLevel === 2
        ? Math.round(input.basePoints * (template.masteryLevel2BonusPercentage / 100))
        : 0;

    const now = new Date();
    await this.prisma.userTemplateStats.update({
      where: {
        userId_templateId: { userId: input.userId, templateId: input.templateId },
      },
      data: {
        masteryLevel: newLevel,
        ...(currentLevel < 1 ? { level1AwardedAt: now } : {}),
        ...(newLevel >= 2 && currentLevel < 2 ? { level2AwardedAt: now } : {}),
      },
    });

    if (bonusPoints > 0) {
      await Promise.all([
        this.prisma.user.update({
          where: { id: input.userId },
          data: { points: { increment: bonusPoints } },
        }),
        this.prisma.pointsLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            userId: input.userId,
            amount: bonusPoints,
            reason: `Mastery level 2 bonus for "${template.title}".`,
          },
        }),
      ]);
    }

    await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        householdId: input.householdId,
        recipientUserId: input.userId,
        type: NotificationType.MASTERY_EARNED,
        title: newLevel === 2 ? 'Mastery level 2 unlocked!' : 'Mastery badge earned!',
        message:
          newLevel === 2
            ? `You've earned the mastery bonus on "${template.title}"! Future completions earn a ${template.masteryLevel2BonusPercentage}% point bonus.`
            : `You've earned a mastery badge on "${template.title}"!`,
        entityType: 'chore_template',
        entityId: input.templateId,
        emailDeliveryStatus: 'SKIPPED',
      },
    });

    return { earned: true, newLevel, bonusPoints };
  }

  async getMasteryStatsForUser(userId: string, householdId: string) {
    const stats = await this.prisma.userTemplateStats.findMany({
      where: { userId, householdId },
      include: {
        template: {
          select: {
            id: true,
            title: true,
            groupTitle: true,
            masteryLevel1Threshold: true,
            masteryLevel2Threshold: true,
            masteryLevel2BonusPercentage: true,
            masteryDisabled: true,
          },
        },
      },
      orderBy: { updatedAtUtc: 'desc' },
    });

    return stats.map((s) => ({
      templateId: s.templateId,
      templateTitle: s.template.title,
      groupTitle: s.template.groupTitle,
      completionCount: s.completionCount,
      masteryLevel: s.masteryLevel,
      level1AwardedAt: s.level1AwardedAt,
      level2AwardedAt: s.level2AwardedAt,
      masteryLevel1Threshold: s.template.masteryLevel1Threshold,
      masteryLevel2Threshold: s.template.masteryLevel2Threshold,
      masteryLevel2BonusPercentage: s.template.masteryLevel2BonusPercentage,
      masteryDisabled: s.template.masteryDisabled,
    }));
  }

  async getMasteryMapForUsers(
    userIds: string[],
    householdId: string,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const stats = await this.prisma.userTemplateStats.findMany({
      where: { userId: { in: userIds }, householdId },
      select: { userId: true, templateId: true, masteryLevel: true },
    });
    return new Map(stats.map((s) => [`${s.userId}:${s.templateId}`, s.masteryLevel]));
  }
}
