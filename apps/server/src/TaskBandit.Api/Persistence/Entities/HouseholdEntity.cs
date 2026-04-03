using TaskBandit.Api.Domain;

namespace TaskBandit.Api.Persistence.Entities;

public sealed class HouseholdEntity
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }

    public HouseholdSettingsEntity Settings { get; set; } = null!;

    public List<UserEntity> Members { get; set; } = [];

    public List<ChoreTemplateEntity> ChoreTemplates { get; set; } = [];

    public List<ChoreInstanceEntity> ChoreInstances { get; set; } = [];
}

public sealed class HouseholdSettingsEntity
{
    public Guid HouseholdId { get; set; }

    public bool SelfSignupEnabled { get; set; }

    public bool MembersCanSeeFullHouseholdChoreDetails { get; set; }

    public bool EnablePushNotifications { get; set; }

    public bool EnableOverduePenalties { get; set; }

    public HouseholdEntity Household { get; set; } = null!;
}

public sealed class UserEntity
{
    public Guid Id { get; set; }

    public Guid HouseholdId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public HouseholdRole Role { get; set; }

    public int Points { get; set; }

    public int CurrentStreak { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public HouseholdEntity Household { get; set; } = null!;
}

