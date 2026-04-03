using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaskBandit.Api.Configuration;
using TaskBandit.Api.Domain;
using TaskBandit.Api.Persistence.Entities;

namespace TaskBandit.Api.Persistence;

public sealed class TaskBanditDbSeeder(IOptions<BootstrapOptions> bootstrapOptions)
{
    public async Task SeedAsync(TaskBanditDbContext dbContext, CancellationToken cancellationToken)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);

        if (!bootstrapOptions.Value.SeedDemoData || await dbContext.Households.AnyAsync(cancellationToken))
        {
            return;
        }

        var householdId = Guid.Parse("b5a1f703-c90a-4227-8345-4dfe1ce2fd75");
        var adminId = Guid.Parse("e4ff7c6d-d986-4fdc-9b97-9b525cab4f29");
        var parentId = Guid.Parse("b3d2f3c6-b1ea-43d5-9f1b-4f6bc6c2b6c4");
        var childId = Guid.Parse("07b7df84-a4b4-4d46-8688-5ca8b0d31f8c");

        var laundryTemplateId = Guid.Parse("3ab30e4c-06b0-4c89-90df-b1c4094a49d2");
        var dryingTemplateId = Guid.Parse("8931210f-1c7e-4890-87da-ebda235fd6f1");

        var household = new HouseholdEntity
        {
            Id = householdId,
            Name = "TaskBandit Home",
            CreatedAtUtc = DateTimeOffset.UtcNow,
            Settings = new HouseholdSettingsEntity
            {
                HouseholdId = householdId,
                SelfSignupEnabled = false,
                MembersCanSeeFullHouseholdChoreDetails = true,
                EnablePushNotifications = true,
                EnableOverduePenalties = true
            },
            Members =
            [
                new UserEntity
                {
                    Id = adminId,
                    HouseholdId = householdId,
                    DisplayName = "Alex",
                    Role = HouseholdRole.Admin,
                    Points = 120,
                    CurrentStreak = 4,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                },
                new UserEntity
                {
                    Id = parentId,
                    HouseholdId = householdId,
                    DisplayName = "Maya",
                    Role = HouseholdRole.Parent,
                    Points = 95,
                    CurrentStreak = 3,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                },
                new UserEntity
                {
                    Id = childId,
                    HouseholdId = householdId,
                    DisplayName = "Luca",
                    Role = HouseholdRole.Child,
                    Points = 40,
                    CurrentStreak = 2,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                }
            ],
            ChoreTemplates =
            [
                new ChoreTemplateEntity
                {
                    Id = laundryTemplateId,
                    HouseholdId = householdId,
                    Title = "Run the washing machine",
                    Description = "Load, start, and confirm the wash cycle.",
                    Difficulty = Difficulty.Medium,
                    BasePoints = 20,
                    AssignmentStrategy = AssignmentStrategyType.RoundRobin,
                    RequirePhotoProof = false,
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    ChecklistItems =
                    [
                        new ChoreTemplateChecklistItemEntity
                        {
                            Id = Guid.NewGuid(),
                            Title = "Add detergent",
                            Required = true,
                            SortOrder = 1
                        },
                        new ChoreTemplateChecklistItemEntity
                        {
                            Id = Guid.NewGuid(),
                            Title = "Start cycle",
                            Required = true,
                            SortOrder = 2
                        }
                    ],
                    Dependencies =
                    [
                        new ChoreTemplateDependencyEntity
                        {
                            Id = Guid.NewGuid(),
                            FollowUpTemplateId = dryingTemplateId
                        }
                    ]
                },
                new ChoreTemplateEntity
                {
                    Id = dryingTemplateId,
                    HouseholdId = householdId,
                    Title = "Hang clothes to dry",
                    Description = "Move the washed laundry to the drying rack.",
                    Difficulty = Difficulty.Easy,
                    BasePoints = 10,
                    AssignmentStrategy = AssignmentStrategyType.LeastCompletedRecently,
                    RequirePhotoProof = true,
                    CreatedAtUtc = DateTimeOffset.UtcNow,
                    ChecklistItems =
                    [
                        new ChoreTemplateChecklistItemEntity
                        {
                            Id = Guid.NewGuid(),
                            Title = "Hang all clothes",
                            Required = true,
                            SortOrder = 1
                        }
                    ]
                }
            ],
            ChoreInstances =
            [
                new ChoreInstanceEntity
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = householdId,
                    TemplateId = laundryTemplateId,
                    Title = "Run the washing machine",
                    State = ChoreState.Assigned,
                    AssigneeId = childId,
                    DueAtUtc = DateTimeOffset.UtcNow.AddHours(4),
                    AwardedPoints = 0,
                    AttachmentCount = 0,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                }
            ]
        };

        dbContext.Households.Add(household);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
