namespace TaskBandit.Api.Domain;

public sealed record HouseholdSettings(
    bool SelfSignupEnabled,
    bool MembersCanSeeFullHouseholdChoreDetails,
    bool EnablePushNotifications,
    bool EnableOverduePenalties);

public sealed record HouseholdMember(
    Guid Id,
    string DisplayName,
    HouseholdRole Role,
    int Points,
    int CurrentStreak);

public sealed record HouseholdSummary(
    Guid HouseholdId,
    string Name,
    HouseholdSettings Settings,
    IReadOnlyList<HouseholdMember> Members);

