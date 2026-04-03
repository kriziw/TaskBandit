using Microsoft.EntityFrameworkCore;
using TaskBandit.Api.Contracts;
using TaskBandit.Api.Domain;
using TaskBandit.Api.Persistence;
using TaskBandit.Api.Persistence.Entities;

namespace TaskBandit.Api.Services;

public sealed class TaskBanditRepository(TaskBanditDbContext dbContext) : ITaskBanditRepository
{
    public async Task<BootstrapStatus> GetBootstrapStatusAsync(CancellationToken cancellationToken)
    {
        var householdCount = await dbContext.Households.CountAsync(cancellationToken);
        return new BootstrapStatus(householdCount > 0, householdCount);
    }

    public async Task<HouseholdSummary> BootstrapHouseholdAsync(
        BootstrapHouseholdRequest request,
        CancellationToken cancellationToken)
    {
        var household = new HouseholdEntity
        {
            Id = Guid.NewGuid(),
            Name = request.HouseholdName.Trim(),
            CreatedAtUtc = DateTimeOffset.UtcNow,
            Settings = new HouseholdSettingsEntity
            {
                SelfSignupEnabled = request.SelfSignupEnabled,
                MembersCanSeeFullHouseholdChoreDetails = true,
                EnablePushNotifications = true,
                EnableOverduePenalties = true
            },
            Members =
            [
                new UserEntity
                {
                    Id = Guid.NewGuid(),
                    DisplayName = request.OwnerDisplayName.Trim(),
                    Role = HouseholdRole.Admin,
                    Points = 0,
                    CurrentStreak = 0,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                }
            ]
        };

        dbContext.Households.Add(household);
        await dbContext.SaveChangesAsync(cancellationToken);

        var hydratedHousehold = await GetPrimaryHouseholdQuery()
            .SingleAsync(x => x.Id == household.Id, cancellationToken);

        return MapHousehold(hydratedHousehold);
    }

    public async Task<HouseholdSummary> GetHouseholdAsync(CancellationToken cancellationToken)
    {
        var household = await GetPrimaryHouseholdQuery()
            .SingleAsync(cancellationToken);

        return MapHousehold(household);
    }

    public async Task<HouseholdSummary> UpdateSettingsAsync(
        UpdateSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var household = await GetPrimaryHouseholdQuery()
            .SingleAsync(cancellationToken);

        household.Settings.SelfSignupEnabled =
            request.SelfSignupEnabled ?? household.Settings.SelfSignupEnabled;
        household.Settings.MembersCanSeeFullHouseholdChoreDetails =
            request.MembersCanSeeFullHouseholdChoreDetails ?? household.Settings.MembersCanSeeFullHouseholdChoreDetails;
        household.Settings.EnablePushNotifications =
            request.EnablePushNotifications ?? household.Settings.EnablePushNotifications;
        household.Settings.EnableOverduePenalties =
            request.EnableOverduePenalties ?? household.Settings.EnableOverduePenalties;

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapHousehold(household);
    }

    public async Task<IReadOnlyList<ChoreTemplate>> GetTemplatesAsync(CancellationToken cancellationToken)
    {
        var templates = await dbContext.ChoreTemplates
            .AsNoTracking()
            .Include(x => x.ChecklistItems)
            .Include(x => x.Dependencies)
            .OrderBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return templates.Select(MapTemplate).ToList();
    }

    public async Task<ChoreTemplate> CreateTemplateAsync(
        CreateChoreTemplateRequest request,
        CancellationToken cancellationToken)
    {
        var householdId = await dbContext.Households
            .AsNoTracking()
            .Select(x => x.Id)
            .SingleAsync(cancellationToken);

        var template = new ChoreTemplateEntity
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Difficulty = request.Difficulty,
            BasePoints = GetBasePoints(request.Difficulty),
            AssignmentStrategy = request.AssignmentStrategy,
            RequirePhotoProof = request.RequirePhotoProof,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            ChecklistItems = request.Checklist?.Select((item, index) => new ChoreTemplateChecklistItemEntity
            {
                Id = Guid.NewGuid(),
                Title = item.Title.Trim(),
                Required = item.Required,
                SortOrder = index + 1
            }).ToList() ?? []
        };

        dbContext.ChoreTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapTemplate(template);
    }

    public async Task<IReadOnlyList<ChoreInstance>> GetInstancesAsync(CancellationToken cancellationToken)
    {
        var instances = await dbContext.ChoreInstances
            .AsNoTracking()
            .OrderBy(x => x.DueAtUtc)
            .ToListAsync(cancellationToken);

        return instances.Select(MapInstance).ToList();
    }

    public async Task<DashboardSummary> GetDashboardSummaryAsync(CancellationToken cancellationToken)
    {
        var household = await GetPrimaryHouseholdQuery()
            .SingleAsync(cancellationToken);
        var instances = await dbContext.ChoreInstances
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var pendingApprovals = instances.Count(instance => instance.State == ChoreState.PendingApproval);
        var activeChores = instances.Count(instance =>
            instance.State is ChoreState.Assigned or ChoreState.InProgress or ChoreState.Open);
        var leaderboard = household.Members
            .Select(MapMember)
            .OrderByDescending(member => member.Points)
            .ThenByDescending(member => member.CurrentStreak)
            .ToList();
        var streakLeader = leaderboard
            .OrderByDescending(member => member.CurrentStreak)
            .ThenByDescending(member => member.Points)
            .FirstOrDefault()?.DisplayName ?? "Nobody";

        return new DashboardSummary(
            PendingApprovals: pendingApprovals,
            ActiveChores: activeChores,
            StreakLeader: streakLeader,
            Leaderboard: leaderboard);
    }

    private IQueryable<HouseholdEntity> GetPrimaryHouseholdQuery() =>
        dbContext.Households
            .Include(x => x.Settings)
            .Include(x => x.Members);

    private static HouseholdSummary MapHousehold(HouseholdEntity household) =>
        new(
            household.Id,
            household.Name,
            new HouseholdSettings(
                household.Settings.SelfSignupEnabled,
                household.Settings.MembersCanSeeFullHouseholdChoreDetails,
                household.Settings.EnablePushNotifications,
                household.Settings.EnableOverduePenalties),
            household.Members
                .Select(MapMember)
                .OrderBy(member => member.DisplayName)
                .ToList());

    private static HouseholdMember MapMember(UserEntity member) =>
        new(member.Id, member.DisplayName, member.Role, member.Points, member.CurrentStreak);

    private static ChoreTemplate MapTemplate(ChoreTemplateEntity template) =>
        new(
            template.Id,
            template.Title,
            template.Description,
            template.Difficulty,
            template.BasePoints,
            template.AssignmentStrategy,
            template.RequirePhotoProof,
            template.ChecklistItems
                .OrderBy(item => item.SortOrder)
                .Select(item => new ChecklistItem(item.Id, item.Title, item.Required))
                .ToList(),
            template.Dependencies
                .Select(dependency => dependency.FollowUpTemplateId)
                .ToList());

    private static ChoreInstance MapInstance(ChoreInstanceEntity instance) =>
        new(
            instance.Id,
            instance.TemplateId,
            instance.Title,
            instance.State,
            instance.AssigneeId,
            instance.DueAtUtc,
            instance.AwardedPoints,
            IsOverdue(instance),
            instance.AttachmentCount);

    private static bool IsOverdue(ChoreInstanceEntity instance) =>
        instance.State == ChoreState.Overdue ||
        (instance.State is not ChoreState.Completed and not ChoreState.Cancelled &&
         instance.DueAtUtc < DateTimeOffset.UtcNow);

    private static int GetBasePoints(Difficulty difficulty) =>
        difficulty switch
        {
            Difficulty.Easy => 10,
            Difficulty.Medium => 20,
            Difficulty.Hard => 40,
            _ => 10
        };
}
