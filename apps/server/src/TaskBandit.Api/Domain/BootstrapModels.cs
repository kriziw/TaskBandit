namespace TaskBandit.Api.Domain;

public sealed record BootstrapStatus(
    bool IsBootstrapped,
    int HouseholdCount);

