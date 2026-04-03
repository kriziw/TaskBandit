namespace TaskBandit.Api.Domain;

public sealed record DashboardSummary(
    int PendingApprovals,
    int ActiveChores,
    string StreakLeader,
    IReadOnlyList<HouseholdMember> Leaderboard);

