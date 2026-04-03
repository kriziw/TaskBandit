import { Injectable } from "@nestjs/common";

export type DifficultyValue = "easy" | "medium" | "hard";

@Injectable()
export class PointsService {
  private static readonly checklistItemBonus = 2;
  private static readonly checklistBonusCap = 10;

  calculateForApprovedCompletion(
    difficulty: DifficultyValue,
    completedChecklistItems: number,
    isOverdue: boolean
  ) {
    const basePoints = this.getBasePoints(difficulty);
    const checklistBonus = Math.min(
      Math.max(0, completedChecklistItems) * PointsService.checklistItemBonus,
      PointsService.checklistBonusCap
    );
    const earnedBeforeTimingAdjustment = basePoints + checklistBonus;
    const finalAwardedPoints = isOverdue
      ? Math.floor(earnedBeforeTimingAdjustment * 0.7)
      : earnedBeforeTimingAdjustment;

    return {
      basePoints,
      checklistBonus,
      earnedBeforeTimingAdjustment,
      finalAwardedPoints,
      overduePenaltyPoints: this.getOverduePenalty(basePoints)
    };
  }

  getOverduePenalty(basePoints: number) {
    return Math.ceil(basePoints * 0.3);
  }

  private getBasePoints(difficulty: DifficultyValue) {
    switch (difficulty) {
      case "easy":
        return 10;
      case "medium":
        return 20;
      case "hard":
        return 40;
      default:
        return 10;
    }
  }
}

