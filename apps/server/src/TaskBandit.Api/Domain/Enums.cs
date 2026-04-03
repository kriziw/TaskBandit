namespace TaskBandit.Api.Domain;

public enum HouseholdRole
{
    Admin,
    Parent,
    Child
}

public enum Difficulty
{
    Easy,
    Medium,
    Hard
}

public enum ChoreState
{
    Open,
    Assigned,
    InProgress,
    PendingApproval,
    NeedsFixes,
    Completed,
    Overdue,
    Cancelled
}

public enum AssignmentStrategyType
{
    RoundRobin,
    LeastCompletedRecently,
    HighestStreak,
    ManualDefaultAssignee
}

