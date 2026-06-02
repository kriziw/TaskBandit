import { Injectable } from '@nestjs/common';
import { LeaderboardResetMode } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Checks whether the household leaderboard is due for a calendar-aligned reset
 * and performs it if so.  Called at dashboard-load time so no cron job is needed.
 */
@Injectable()
export class LeaderboardResetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns true if a reset was performed, false otherwise.
   */
  async checkAndReset(householdId: string): Promise<boolean> {
    const settings = await this.prisma.householdSettings.findUnique({
      where: { householdId },
      select: { leaderboardResetMode: true, lastLeaderboardResetAt: true },
    });

    if (!settings || settings.leaderboardResetMode === LeaderboardResetMode.NEVER) {
      return false;
    }

    const now = new Date();
    const periodStart = this.getPeriodStart(settings.leaderboardResetMode, now);

    if (periodStart === null) {
      return false;
    }

    const lastReset = settings.lastLeaderboardResetAt;
    if (lastReset && lastReset >= periodStart) {
      // Already reset this period.
      return false;
    }

    // Reset leaderboard scores for all members of this household.
    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { householdId },
        data: { leaderboardPoints: 0 },
      }),
      this.prisma.householdSettings.update({
        where: { householdId },
        data: { lastLeaderboardResetAt: now },
      }),
    ]);

    return true;
  }

  /**
   * Returns the start of the current period (week / month / quarter).
   * All timestamps are UTC-midnight aligned.
   */
  private getPeriodStart(mode: LeaderboardResetMode, now: Date): Date | null {
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth(); // 0-indexed
    const utcDate = now.getUTCDate();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, …

    switch (mode) {
      case LeaderboardResetMode.WEEKLY: {
        // Align to most recent Monday (UTC).
        const daysFromMonday = (utcDay + 6) % 7; // Mon=0, Tue=1, …
        const monday = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysFromMonday));
        return monday;
      }
      case LeaderboardResetMode.MONTHLY: {
        return new Date(Date.UTC(utcYear, utcMonth, 1));
      }
      case LeaderboardResetMode.QUARTERLY: {
        const quarterStartMonth = Math.floor(utcMonth / 3) * 3;
        return new Date(Date.UTC(utcYear, quarterStartMonth, 1));
      }
      default:
        return null;
    }
  }
}
