namespace TaskBandit.Api.Domain;

public sealed record ChecklistItem(Guid Id, string Title, bool Required);

public sealed record ChoreTemplate(
    Guid Id,
    string Title,
    string Description,
    Difficulty Difficulty,
    int BasePoints,
    AssignmentStrategyType AssignmentStrategy,
    bool RequirePhotoProof,
    IReadOnlyList<ChecklistItem> Checklist,
    IReadOnlyList<Guid> DependencyTemplateIds);

public sealed record ChoreInstance(
    Guid Id,
    Guid TemplateId,
    string Title,
    ChoreState State,
    Guid? AssigneeId,
    DateTimeOffset DueAt,
    int AwardedPoints,
    bool IsOverdue,
    int AttachmentCount);

