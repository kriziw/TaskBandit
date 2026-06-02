import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const ACHIEVEMENT_DEFINITIONS = [
  {
    key: 'first_chore',
    name: 'First Steps',
    descriptionKey: 'achievement.first_chore.description',
    category: 'milestone',
    isRepeatable: false,
    goal: 1,
    bonusPoints: 10,
    sortOrder: 0,
  },
  {
    key: 'streak_5',
    name: 'On a Roll',
    descriptionKey: 'achievement.streak_5.description',
    category: 'streak',
    isRepeatable: false,
    goal: 5,
    bonusPoints: 15,
    sortOrder: 10,
  },
  {
    key: 'streak_25',
    name: 'Habit Formed',
    descriptionKey: 'achievement.streak_25.description',
    category: 'streak',
    isRepeatable: false,
    goal: 25,
    bonusPoints: 50,
    sortOrder: 11,
  },
  {
    key: 'streak_50',
    name: 'Unstoppable',
    descriptionKey: 'achievement.streak_50.description',
    category: 'streak',
    isRepeatable: true,
    goal: 50,
    bonusPoints: 100,
    sortOrder: 12,
  },
  {
    key: 'perfect_day',
    name: 'Perfect Day',
    descriptionKey: 'achievement.perfect_day.description',
    category: 'consistency',
    isRepeatable: true,
    goal: 1,
    bonusPoints: 5,
    sortOrder: 20,
  },
  {
    key: 'perfect_week',
    name: 'Flawless Week',
    descriptionKey: 'achievement.perfect_week.description',
    category: 'consistency',
    isRepeatable: true,
    goal: 7,
    bonusPoints: 25,
    sortOrder: 21,
  },
  {
    key: 'points_100',
    name: 'Century',
    descriptionKey: 'achievement.points_100.description',
    category: 'points',
    isRepeatable: false,
    goal: 100,
    bonusPoints: 0,
    sortOrder: 30,
  },
  {
    key: 'points_500',
    name: 'High Scorer',
    descriptionKey: 'achievement.points_500.description',
    category: 'points',
    isRepeatable: false,
    goal: 500,
    bonusPoints: 0,
    sortOrder: 31,
  },
  {
    key: 'points_1000',
    name: 'Points Legend',
    descriptionKey: 'achievement.points_1000.description',
    category: 'points',
    isRepeatable: false,
    goal: 1000,
    bonusPoints: 0,
    sortOrder: 32,
  },
  {
    key: 'hard_chore_5',
    name: 'Tough Tackler',
    descriptionKey: 'achievement.hard_chore_5.description',
    category: 'difficulty',
    isRepeatable: false,
    goal: 5,
    bonusPoints: 20,
    sortOrder: 40,
  },
  {
    key: 'hard_chore_25',
    name: 'Chore Champion',
    descriptionKey: 'achievement.hard_chore_25.description',
    category: 'difficulty',
    isRepeatable: false,
    goal: 25,
    bonusPoints: 50,
    sortOrder: 41,
  },
  {
    key: 'multi_group_helper',
    name: 'All-Rounder',
    descriptionKey: 'achievement.multi_group_helper.description',
    category: 'collaboration',
    isRepeatable: false,
    goal: 3,
    bonusPoints: 30,
    sortOrder: 50,
  },
] as const;

export interface AchievementEvalInput {
  userId: string;
  householdId: string;
  tenantId: string;
  choreCompleted: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  choreGroupTitle?: string | null;
  isPerfectDay: boolean;
  isPerfectWeek?: boolean;
}

export interface UnlockedAchievement {
  key: string;
  name: string;
  descriptionKey: string;
  category: string;
  bonusPoints: number;
  timesEarned: number;
}

@Injectable()
export class AchievementsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await this.prisma.achievement.upsert({
        where: { key: def.key },
        create: def,
        update: {
          name: def.name,
          descriptionKey: def.descriptionKey,
          category: def.category,
          isRepeatable: def.isRepeatable,
          goal: def.goal,
          bonusPoints: def.bonusPoints,
          sortOrder: def.sortOrder,
        },
      });
    }
  }

  async evaluateForUser(input: AchievementEvalInput): Promise<UnlockedAchievement[]> {
    const settings = await this.prisma.householdSettings.findUnique({
      where: { householdId: input.householdId },
      select: { enableAchievements: true },
    });
    if (!settings?.enableAchievements) {
      return [];
    }

    const [achievements, user, existingProgress] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { points: true, currentStreak: true },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId: input.userId },
      }),
    ]);

    const progressMap = new Map(existingProgress.map((p) => [p.achievementKey, p]));
    const unlocked: UnlockedAchievement[] = [];

    for (const achievement of achievements) {
      const current = progressMap.get(achievement.key);
      const alreadyEarned = !achievement.isRepeatable && current?.earnedAt != null;
      if (alreadyEarned) continue;

      const newProgress = await this.computeProgress(
        achievement.key,
        input,
        user,
        current?.progress ?? 0,
      );
      if (newProgress === null) continue;

      const clampedProgress = Math.min(newProgress, achievement.goal);
      const didJustUnlock = clampedProgress >= achievement.goal;

      await this.prisma.userAchievement.upsert({
        where: { userId_achievementKey: { userId: input.userId, achievementKey: achievement.key } },
        create: {
          tenantId: input.tenantId,
          householdId: input.householdId,
          userId: input.userId,
          achievementKey: achievement.key,
          progress: clampedProgress,
          earnedAt: didJustUnlock ? new Date() : null,
          timesEarned: didJustUnlock ? 1 : 0,
        },
        update: {
          progress: clampedProgress,
          ...(didJustUnlock && !current?.earnedAt
            ? {
                earnedAt: new Date(),
                timesEarned: { increment: 1 },
              }
            : achievement.isRepeatable && current?.earnedAt && didJustUnlock
              ? {
                  earnedAt: new Date(),
                  timesEarned: { increment: 1 },
                  progress: 0,
                }
              : {}),
        },
      });

      if (didJustUnlock) {
        const timesEarned = (current?.timesEarned ?? 0) + 1;
        if (achievement.bonusPoints > 0) {
          await this.prisma.pointsLedgerEntry.create({
            data: {
              tenantId: input.tenantId,
              householdId: input.householdId,
              userId: input.userId,
              amount: achievement.bonusPoints,
              reason: `Achievement unlocked: ${achievement.name}`,
            },
          });
          await this.prisma.user.update({
            where: { id: input.userId },
            data: {
              points: { increment: achievement.bonusPoints },
              leaderboardPoints: { increment: achievement.bonusPoints },
            },
          });
        }

        await this.prisma.notification.create({
          data: {
            tenantId: input.tenantId,
            householdId: input.householdId,
            recipientUserId: input.userId,
            type: NotificationType.ACHIEVEMENT_UNLOCKED,
            title: 'Achievement unlocked',
            message: achievement.name,
            entityType: 'achievement',
            entityId: achievement.key,
            emailDeliveryStatus: 'SKIPPED',
          },
        });

        unlocked.push({
          key: achievement.key,
          name: achievement.name,
          descriptionKey: achievement.descriptionKey,
          category: achievement.category,
          bonusPoints: achievement.bonusPoints,
          timesEarned,
        });
      }
    }

    return unlocked;
  }

  async getForHousehold(householdId: string) {
    const [achievements, userAchievements] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.userAchievement.findMany({
        where: { householdId },
        include: { user: { select: { id: true, displayName: true } } },
      }),
    ]);

    return achievements.map((a) => ({
      ...a,
      userProgress: userAchievements
        .filter((ua) => ua.achievementKey === a.key)
        .map((ua) => ({
          userId: ua.userId,
          displayName: ua.user.displayName,
          progress: ua.progress,
          earnedAt: ua.earnedAt,
          timesEarned: ua.timesEarned,
        })),
    }));
  }

  async getForUser(userId: string, householdId: string) {
    const [achievements, userProgress] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { userId, householdId } }),
    ]);

    const progressMap = new Map(userProgress.map((p) => [p.achievementKey, p]));
    return achievements.map((a) => {
      const p = progressMap.get(a.key);
      return {
        ...a,
        progress: p?.progress ?? 0,
        earnedAt: p?.earnedAt ?? null,
        timesEarned: p?.timesEarned ?? 0,
      };
    });
  }

  async resetForHousehold(householdId: string) {
    await this.prisma.userAchievement.deleteMany({ where: { householdId } });
  }

  private async computeProgress(
    key: string,
    input: AchievementEvalInput,
    user: { points: number; currentStreak: number },
    currentProgress: number,
  ): Promise<number | null> {
    if (key === 'first_chore') {
      if (!input.choreCompleted) return null;
      return currentProgress + 1;
    }

    if (key === 'hard_chore_5' || key === 'hard_chore_25') {
      if (!input.choreCompleted || input.difficulty !== 'hard') return null;
      return currentProgress + 1;
    }

    if (key === 'streak_5' || key === 'streak_25' || key === 'streak_50') {
      return user.currentStreak;
    }

    if (key === 'perfect_day') {
      if (!input.isPerfectDay) return null;
      return currentProgress + 1;
    }

    if (key === 'perfect_week') {
      if (!input.isPerfectDay) return null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const perfectDayCount = await this.prisma.auditLog.count({
        where: {
          householdId: input.householdId,
          action: 'milestone.perfect_day',
          entityType: 'user',
          entityId: { startsWith: `${input.userId}:` },
          createdAtUtc: { gte: sevenDaysAgo },
        },
      });
      return perfectDayCount;
    }

    if (key === 'points_100' || key === 'points_500' || key === 'points_1000') {
      return user.points;
    }

    if (key === 'multi_group_helper') {
      if (!input.choreCompleted || !input.choreGroupTitle) return null;
      const completedInstances = await this.prisma.choreInstance.findMany({
        where: {
          assigneeId: input.userId,
          householdId: input.householdId,
          state: 'COMPLETED',
          templateId: { not: null },
        },
        select: { templateId: true },
        distinct: ['templateId'],
      });
      const templateIds = completedInstances.map((i) => i.templateId).filter(Boolean) as string[];
      if (templateIds.length === 0) return 0;
      const templates = await this.prisma.choreTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { groupTitle: true },
      });
      const distinctGroups = new Set(templates.map((t) => t.groupTitle));
      return distinctGroups.size;
    }

    return null;
  }
}
