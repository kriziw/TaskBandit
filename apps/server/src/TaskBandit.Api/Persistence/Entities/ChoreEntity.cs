using TaskBandit.Api.Domain;

namespace TaskBandit.Api.Persistence.Entities;

public sealed class ChoreTemplateEntity
{
    public Guid Id { get; set; }

    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public Difficulty Difficulty { get; set; }

    public int BasePoints { get; set; }

    public AssignmentStrategyType AssignmentStrategy { get; set; }

    public bool RequirePhotoProof { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public HouseholdEntity Household { get; set; } = null!;

    public List<ChoreTemplateChecklistItemEntity> ChecklistItems { get; set; } = [];

    public List<ChoreTemplateDependencyEntity> Dependencies { get; set; } = [];
}

public sealed class ChoreTemplateChecklistItemEntity
{
    public Guid Id { get; set; }

    public Guid TemplateId { get; set; }

    public string Title { get; set; } = string.Empty;

    public bool Required { get; set; }

    public int SortOrder { get; set; }

    public ChoreTemplateEntity Template { get; set; } = null!;
}

public sealed class ChoreTemplateDependencyEntity
{
    public Guid Id { get; set; }

    public Guid TemplateId { get; set; }

    public Guid FollowUpTemplateId { get; set; }

    public ChoreTemplateEntity Template { get; set; } = null!;
}

public sealed class ChoreInstanceEntity
{
    public Guid Id { get; set; }

    public Guid HouseholdId { get; set; }

    public Guid TemplateId { get; set; }

    public string Title { get; set; } = string.Empty;

    public ChoreState State { get; set; }

    public Guid? AssigneeId { get; set; }

    public DateTimeOffset DueAtUtc { get; set; }

    public int AwardedPoints { get; set; }

    public int AttachmentCount { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset? CompletedAtUtc { get; set; }

    public HouseholdEntity Household { get; set; } = null!;

    public ChoreTemplateEntity Template { get; set; } = null!;
}

