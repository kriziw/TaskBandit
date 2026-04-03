using TaskBandit.Api.Domain;

namespace TaskBandit.Api.Contracts;

public sealed record CreateChecklistItemRequest(string Title, bool Required);

public sealed record CreateChoreTemplateRequest(
    string Title,
    string Description,
    Difficulty Difficulty,
    AssignmentStrategyType AssignmentStrategy,
    bool RequirePhotoProof,
    IReadOnlyList<CreateChecklistItemRequest>? Checklist);

