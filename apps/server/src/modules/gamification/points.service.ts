import { Injectable } from '@nestjs/common';

export type DifficultyValue = 'easy' | 'medium' | 'hard';

@Injectable()
export class PointsService {
  private static readonly checklistItemBonus = 2;
  private static readonly checklistBonusCap = 10;

  calculateForApprovedCompletion(
    difficulty: DifficultyValue,
    completedChecklistItems: number,
    isOverdue: boolean,
  ) {
    const basePoints = this.getBasePoints(difficulty);
    const checklistBonus = Math.min(
      Math.max(0, completedChecklistItems) * PointsService.checklistItemBonus,
      PointsService.checklistBonusCap,
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
      overduePenaltyPoints: this.getOverduePenalty(basePoints),
    };
  }

  calculateHelperPoints(
    primaryPoints: number,
    helperCount: number,
    mode: 'FULL_TO_EACH' | 'SPLIT_EQUALLY' | 'PRIMARY_PLUS_BONUS',
    helperBonus: number,
  ): number {
    switch (mode) {
      case 'FULL_TO_EACH':
        return primaryPoints;
      case 'SPLIT_EQUALLY':
        return Math.floor(primaryPoints / (helperCount + 1));
      case 'PRIMARY_PLUS_BONUS':
        return helperBonus;
      default:
        return primaryPoints;
    }
  }

  getOverduePenalty(basePoints: number) {
    return Math.ceil(basePoints * 0.3);
  }

  private getBasePoints(difficulty: DifficultyValue) {
    switch (difficulty) {
      case 'easy':
        return 10;
      case 'medium':
        return 20;
      case 'hard':
        return 40;
      default:
        return 10;
    }
  }
}
