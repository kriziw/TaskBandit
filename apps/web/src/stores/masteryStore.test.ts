import { describe, expect, it } from 'vitest';
import type { MasteryStats } from '../types/taskbandit';

const makeStats = (overrides: Partial<MasteryStats> = {}): MasteryStats => ({
  templateId: 'tpl-1',
  templateTitle: 'Dishes',
  groupTitle: 'Kitchen',
  completionCount: 0,
  masteryLevel: 0,
  level1AwardedAt: null,
  level2AwardedAt: null,
  masteryLevel1Threshold: 5,
  masteryLevel2Threshold: 10,
  masteryLevel2BonusPercentage: 10,
  masteryDisabled: false,
  ...overrides,
});

describe('MasteryStats type', () => {
  it('correctly represents a template with no mastery', () => {
    const stats = makeStats();
    expect(stats.masteryLevel).toBe(0);
    expect(stats.level1AwardedAt).toBeNull();
    expect(stats.level2AwardedAt).toBeNull();
  });

  it('correctly represents a template at level 1', () => {
    const stats = makeStats({
      masteryLevel: 1,
      completionCount: 5,
      level1AwardedAt: '2026-01-01T00:00:00Z',
    });
    expect(stats.masteryLevel).toBe(1);
    expect(stats.level1AwardedAt).not.toBeNull();
    expect(stats.level2AwardedAt).toBeNull();
  });

  it('correctly represents a template at level 2 with bonus', () => {
    const stats = makeStats({
      masteryLevel: 2,
      completionCount: 10,
      level1AwardedAt: '2026-01-01T00:00:00Z',
      level2AwardedAt: '2026-02-01T00:00:00Z',
    });
    expect(stats.masteryLevel).toBe(2);
    expect(stats.level1AwardedAt).not.toBeNull();
    expect(stats.level2AwardedAt).not.toBeNull();
    expect(stats.masteryLevel2BonusPercentage).toBe(10);
  });

  it('progress value is capped at maxThreshold', () => {
    const stats = makeStats({ masteryLevel: 0, completionCount: 7 });
    const maxProgress =
      stats.masteryLevel >= 2 ? stats.masteryLevel2Threshold : stats.masteryLevel1Threshold;
    const progressValue = Math.min(stats.completionCount, maxProgress);
    expect(progressValue).toBe(5); // capped at level1Threshold=5
  });

  it('progress at level 2 is capped at level2Threshold', () => {
    const stats = makeStats({ masteryLevel: 2, completionCount: 15 });
    const maxProgress = stats.masteryLevel2Threshold;
    const progressValue = Math.min(stats.completionCount, maxProgress);
    expect(progressValue).toBe(10);
  });
});
