namespace TaskBandit.Api.Gamification;

public sealed record PointsBreakdown(
    int BasePoints,
    int ChecklistBonus,
    int EarnedBeforeTimingAdjustment,
    int FinalAwardedPoints,
    int OverduePenaltyPoints);

