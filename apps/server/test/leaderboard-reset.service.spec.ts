import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardResetService } from '../src/modules/dashboard/leaderboard-reset.service';

function makePrisma(settingsOverride: Record<string, unknown> = {}) {
  const defaultSettings = {
    leaderboardResetMode: 'NEVER',
    lastLeaderboardResetAt: null,
    ...settingsOverride,
  };

  const householdSettings = {
    findUnique: vi.fn().mockResolvedValue(defaultSettings),
    update: vi.fn().mockResolvedValue({}),
  };
  const user = {
    updateMany: vi.fn().mockResolvedValue({ count: 3 }),
  };

  return {
    householdSettings,
    user,
    $transaction: vi.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
  };
}

describe('LeaderboardResetService', () => {
  it('does not reset when mode is NEVER', async () => {
    const prisma = makePrisma({ leaderboardResetMode: 'NEVER' });
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');

    expect(result).toBe(false);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('does not reset when already reset this week (WEEKLY mode)', async () => {
    const now = new Date();
    // Set lastLeaderboardResetAt to today (same week)
    const prisma = makePrisma({
      leaderboardResetMode: 'WEEKLY',
      lastLeaderboardResetAt: now,
    });
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');
    expect(result).toBe(false);
  });

  it('resets when lastLeaderboardResetAt is null and mode is WEEKLY', async () => {
    const prisma = makePrisma({
      leaderboardResetMode: 'WEEKLY',
      lastLeaderboardResetAt: null,
    });
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');

    expect(result).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('resets when lastLeaderboardResetAt is before the current month start (MONTHLY mode)', async () => {
    const now = new Date();
    const lastMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 15);
    const prisma = makePrisma({
      leaderboardResetMode: 'MONTHLY',
      lastLeaderboardResetAt: lastMonth,
    });
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');

    expect(result).toBe(true);
  });

  it('does not reset when already reset this month (MONTHLY mode)', async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2));
    const prisma = makePrisma({
      leaderboardResetMode: 'MONTHLY',
      lastLeaderboardResetAt: thisMonth,
    });
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');

    expect(result).toBe(false);
  });

  it('resets when lastLeaderboardResetAt is before the current quarter (QUARTERLY mode)', async () => {
    const now = new Date();
    const previousYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const prisma = makePrisma({
      leaderboardResetMode: 'QUARTERLY',
      lastLeaderboardResetAt: previousYear,
    });
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');

    expect(result).toBe(true);
  });

  it('returns false when settings is null', async () => {
    const prisma = makePrisma();
    prisma.householdSettings.findUnique.mockResolvedValue(null);
    const service = new LeaderboardResetService(prisma as never);

    const result = await service.checkAndReset('household-1');
    expect(result).toBe(false);
  });
});
