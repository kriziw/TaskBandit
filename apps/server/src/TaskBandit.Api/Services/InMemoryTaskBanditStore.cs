using TaskBandit.Api.Contracts;
using TaskBandit.Api.Domain;

namespace TaskBandit.Api.Services;

public sealed class InMemoryTaskBanditStore
{
    private HouseholdSummary _household;
    private readonly List<ChoreTemplate> _templates = [];
    private readonly List<ChoreInstance> _instances = [];

    public InMemoryTaskBanditStore()
    {
        _household = new HouseholdSummary(
            Guid.Parse("b5a1f703-c90a-4227-8345-4dfe1ce2fd75"),
            "TaskBandit Home",
            new HouseholdSettings(
                SelfSignupEnabled: false,
                MembersCanSeeFullHouseholdChoreDetails: true,
                EnablePushNotifications: true,
                EnableOverduePenalties: true),
            [
                new HouseholdMember(Guid.NewGuid(), "Alex", HouseholdRole.Admin, 120, 4),
                new HouseholdMember(Guid.NewGuid(), "Maya", HouseholdRole.Parent, 95, 3),
                new HouseholdMember(Guid.NewGuid(), "Luca", HouseholdRole.Child, 40, 2)
            ]);

        var laundryTemplateId = Guid.NewGuid();
        var dryingTemplateId = Guid.NewGuid();

        _templates.Add(new ChoreTemplate(
            laundryTemplateId,
            "Run the washing machine",
            "Load, start, and confirm the wash cycle.",
            Difficulty.Medium,
            20,
            AssignmentStrategyType.RoundRobin,
            RequirePhotoProof: false,
            Checklist:
            [
                new ChecklistItem(Guid.NewGuid(), "Add detergent", true),
                new ChecklistItem(Guid.NewGuid(), "Start cycle", true)
            ],
            DependencyTemplateIds: [dryingTemplateId]));

        _templates.Add(new ChoreTemplate(
            dryingTemplateId,
            "Hang clothes to dry",
            "Move the washed laundry to the drying rack.",
            Difficulty.Easy,
            10,
            AssignmentStrategyType.LeastCompletedRecently,
            RequirePhotoProof: true,
            Checklist:
            [
                new ChecklistItem(Guid.NewGuid(), "Hang all clothes", true)
            ],
            DependencyTemplateIds: []));

        _instances.Add(new ChoreInstance(
            Guid.NewGuid(),
            laundryTemplateId,
            "Run the washing machine",
            ChoreState.Assigned,
            _household.Members[2].Id,
            DateTimeOffset.UtcNow.AddHours(4),
            AwardedPoints: 0,
            IsOverdue: false,
            AttachmentCount: 0));
    }

    public HouseholdSummary GetHousehold() => _household;

    public HouseholdSummary UpdateSettings(UpdateSettingsRequest request)
    {
        var updatedSettings = _household.Settings with
        {
            SelfSignupEnabled = request.SelfSignupEnabled ?? _household.Settings.SelfSignupEnabled,
            MembersCanSeeFullHouseholdChoreDetails = request.MembersCanSeeFullHouseholdChoreDetails ?? _household.Settings.MembersCanSeeFullHouseholdChoreDetails,
            EnablePushNotifications = request.EnablePushNotifications ?? _household.Settings.EnablePushNotifications,
            EnableOverduePenalties = request.EnableOverduePenalties ?? _household.Settings.EnableOverduePenalties
        };

        _household = _household with { Settings = updatedSettings };
        return _household;
    }

    public IReadOnlyList<ChoreTemplate> GetTemplates() => _templates;

    public IReadOnlyList<ChoreInstance> GetInstances() => _instances;

    public DashboardSummary GetDashboardSummary()
    {
        var pendingApprovals = _instances.Count(instance => instance.State == ChoreState.PendingApproval);
        var activeChores = _instances.Count(instance => instance.State is ChoreState.Assigned or ChoreState.InProgress or ChoreState.Open);
        var streakLeader = _household.Members
            .OrderByDescending(member => member.CurrentStreak)
            .ThenByDescending(member => member.Points)
            .FirstOrDefault()?.DisplayName ?? "Nobody";
        var leaderboard = _household.Members
            .OrderByDescending(member => member.Points)
            .ThenByDescending(member => member.CurrentStreak)
            .ToList();

        return new DashboardSummary(
            PendingApprovals: pendingApprovals,
            ActiveChores: activeChores,
            StreakLeader: streakLeader,
            Leaderboard: leaderboard);
    }

    public ChoreTemplate CreateTemplate(CreateChoreTemplateRequest request)
    {
        var template = new ChoreTemplate(
            Guid.NewGuid(),
            request.Title,
            request.Description,
            request.Difficulty,
            GetBasePoints(request.Difficulty),
            request.AssignmentStrategy,
            request.RequirePhotoProof,
            request.Checklist?.Select(item => new ChecklistItem(Guid.NewGuid(), item.Title, item.Required)).ToList()
                ?? [],
            []);

        _templates.Add(template);
        return template;
    }

    private static int GetBasePoints(Difficulty difficulty) =>
        difficulty switch
        {
            Difficulty.Easy => 10,
            Difficulty.Medium => 20,
            Difficulty.Hard => 40,
            _ => 10
        };
}
