using TaskBandit.Api.Domain;

namespace TaskBandit.Api.Gamification;

public sealed class PointsCalculator
{
    private const int ChecklistItemBonus = 2;
    private const int ChecklistBonusCap = 10;

    public PointsBreakdown CalculateForApprovedCompletion(
        Difficulty difficulty,
        int completedChecklistItems,
        bool isOverdue)
    {
        var basePoints = GetBasePoints(difficulty);
        var checklistBonus = Math.Min(completedChecklistItems * ChecklistItemBonus, ChecklistBonusCap);
        var earnedBeforeTimingAdjustment = basePoints + checklistBonus;
        var finalAwardedPoints = isOverdue
            ? (int)Math.Floor(earnedBeforeTimingAdjustment * 0.7m)
            : earnedBeforeTimingAdjustment;

        return new PointsBreakdown(
            BasePoints: basePoints,
            ChecklistBonus: checklistBonus,
            EarnedBeforeTimingAdjustment: earnedBeforeTimingAdjustment,
            FinalAwardedPoints: finalAwardedPoints,
            OverduePenaltyPoints: GetOverduePenalty(basePoints));
    }

    public int GetOverduePenalty(int basePoints) =>
        (int)Math.Ceiling(basePoints * 0.3m);

    private static int GetBasePoints(Difficulty difficulty) =>
        difficulty switch
        {
            Difficulty.Easy => 10,
            Difficulty.Medium => 20,
            Difficulty.Hard => 40,
            _ => 10
        };
}

