import { describe, expect, it } from "vitest";
import { PointsService } from "../src/modules/gamification/points.service";

describe("PointsService", () => {
  const service = new PointsService();

  it("caps checklist bonus", () => {
    const result = service.calculateForApprovedCompletion("hard", 9, false);

    expect(result.basePoints).toBe(40);
    expect(result.checklistBonus).toBe(10);
    expect(result.finalAwardedPoints).toBe(50);
  });

  it("applies overdue reduction", () => {
    const result = service.calculateForApprovedCompletion("medium", 2, true);

    expect(result.earnedBeforeTimingAdjustment).toBe(24);
    expect(result.finalAwardedPoints).toBe(16);
    expect(result.overduePenaltyPoints).toBe(6);
  });
});

