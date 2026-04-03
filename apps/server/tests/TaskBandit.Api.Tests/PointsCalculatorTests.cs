using TaskBandit.Api.Domain;
using TaskBandit.Api.Gamification;

namespace TaskBandit.Api.Tests;

public sealed class PointsCalculatorTests
{
    private readonly PointsCalculator _calculator = new();

    [Fact]
    public void ApprovedCompletion_AppliesChecklistBonusCap()
    {
        var result = _calculator.CalculateForApprovedCompletion(
            Difficulty.Hard,
            completedChecklistItems: 9,
            isOverdue: false);

        Assert.Equal(40, result.BasePoints);
        Assert.Equal(10, result.ChecklistBonus);
        Assert.Equal(50, result.FinalAwardedPoints);
    }

    [Fact]
    public void ApprovedCompletion_AppliesOverdueReduction()
    {
        var result = _calculator.CalculateForApprovedCompletion(
            Difficulty.Medium,
            completedChecklistItems: 2,
            isOverdue: true);

        Assert.Equal(24, result.EarnedBeforeTimingAdjustment);
        Assert.Equal(16, result.FinalAwardedPoints);
        Assert.Equal(6, result.OverduePenaltyPoints);
    }
}

