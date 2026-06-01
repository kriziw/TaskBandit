import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MasteryService } from '../src/modules/chores/mastery.service';

const BASE_INPUT = {
  userId: 'user-1',
  householdId: 'household-1',
  tenantId: 'tenant-1',
  templateId: 'template-1',
  basePoints: 20,
};

const TEMPLATE_ACTIVE = {
  title: 'Dishes',
  masteryDisabled: false,
  masteryLevel1Threshold: 5,
  masteryLevel2Threshold: 10,
  masteryLevel2BonusPercentage: 10,
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  const upsertResult = { completionCount: 1, masteryLevel: 0 };
  const notifications: unknown[] = [];
  const ledgerEntries: unknown[] = [];

  return {
    choreTemplate: {
      findUnique: vi.fn().mockResolvedValue(TEMPLATE_ACTIVE),
    },
    userTemplateStats: {
      upsert: vi.fn().mockResolvedValue(upsertResult),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
    pointsLedgerEntry: {
      create: vi.fn().mockImplementation((args) => {
        ledgerEntries.push(args);
        return Promise.resolve({});
      }),
    },
    notification: {
      create: vi.fn().mockImplementation((args) => {
        notifications.push(args);
        return Promise.resolve({});
      }),
    },
    _notifications: notifications,
    _ledgerEntries: ledgerEntries,
    ...overrides,
  };
}

describe('MasteryService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: MasteryService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new MasteryService(prisma as never);
  });

  it('returns earned=false when masteryDisabled is true', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue({ ...TEMPLATE_ACTIVE, masteryDisabled: true });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result).toEqual({ earned: false, newLevel: 0, bonusPoints: 0 });
    expect(prisma.userTemplateStats.upsert).not.toHaveBeenCalled();
  });

  it('returns earned=false when template does not exist', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue(null);

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result).toEqual({ earned: false, newLevel: 0, bonusPoints: 0 });
  });

  it('increments completionCount but does not advance level below threshold', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 3, masteryLevel: 0 });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result).toEqual({ earned: false, newLevel: 0, bonusPoints: 0 });
    expect(prisma.userTemplateStats.update).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('advances to level 1 when completionCount reaches level1Threshold', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 5, masteryLevel: 0 });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result.earned).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(result.bonusPoints).toBe(0);
    expect(prisma.userTemplateStats.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ masteryLevel: 1, level1AwardedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledOnce();
    const notif = (prisma._notifications[0] as any).data;
    expect(notif.type).toBe('MASTERY_EARNED');
    expect(notif.title).toContain('badge');
  });

  it('advances to level 2 when completionCount reaches level2Threshold', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 10, masteryLevel: 1 });

    const result = await service.evaluateMasteryAfterApproval({ ...BASE_INPUT, basePoints: 20 });

    expect(result.earned).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.bonusPoints).toBe(2); // 10% of 20
    expect(prisma.pointsLedgerEntry.create).toHaveBeenCalledOnce();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 2 } } }),
    );
    const notif = (prisma._notifications[0] as any).data;
    expect(notif.type).toBe('MASTERY_EARNED');
    expect(notif.title).toContain('level 2');
  });

  it('jumps directly to level 2 when both thresholds are met and current level is 0', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 10, masteryLevel: 0 });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result.newLevel).toBe(2);
    expect(result.earned).toBe(true);
  });

  it('does not re-award level 1 when already at level 1', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 6, masteryLevel: 1 });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result.earned).toBe(false);
    expect(result.newLevel).toBe(1);
  });

  it('does not advance past level 2 when already at level 2', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 20, masteryLevel: 2 });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result.earned).toBe(false);
    expect(result.newLevel).toBe(2);
    expect(prisma.userTemplateStats.update).not.toHaveBeenCalled();
  });

  it('calculates bonus points correctly using Math.round', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue({
      ...TEMPLATE_ACTIVE,
      masteryLevel2BonusPercentage: 15,
    });
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 10, masteryLevel: 1 });

    const result = await service.evaluateMasteryAfterApproval({ ...BASE_INPUT, basePoints: 7 });

    // 15% of 7 = 1.05 → rounds to 1
    expect(result.bonusPoints).toBe(1);
  });

  it('awards 0 bonus points for level 2 with 0% bonus percentage', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue({
      ...TEMPLATE_ACTIVE,
      masteryLevel2BonusPercentage: 0,
    });
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 10, masteryLevel: 1 });

    const result = await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(result.bonusPoints).toBe(0);
    expect(prisma.pointsLedgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    // Notification still fires
    expect(prisma.notification.create).toHaveBeenCalledOnce();
  });

  it('sets level1AwardedAt and level2AwardedAt when jumping from 0 to 2', async () => {
    prisma.userTemplateStats.upsert.mockResolvedValue({ completionCount: 10, masteryLevel: 0 });

    await service.evaluateMasteryAfterApproval(BASE_INPUT);

    expect(prisma.userTemplateStats.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          masteryLevel: 2,
          level1AwardedAt: expect.any(Date),
          level2AwardedAt: expect.any(Date),
        }),
      }),
    );
  });
});
