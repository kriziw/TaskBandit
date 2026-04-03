namespace TaskBandit.Api.Contracts;

public sealed record BootstrapHouseholdRequest(
    string HouseholdName,
    string OwnerDisplayName,
    bool SelfSignupEnabled);

