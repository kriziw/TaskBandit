using TaskBandit.Api.Contracts;
using TaskBandit.Api.Domain;

namespace TaskBandit.Api.Services;

public interface ITaskBanditRepository
{
    Task<BootstrapStatus> GetBootstrapStatusAsync(CancellationToken cancellationToken);

    Task<HouseholdSummary> BootstrapHouseholdAsync(BootstrapHouseholdRequest request, CancellationToken cancellationToken);

    Task<HouseholdSummary> GetHouseholdAsync(CancellationToken cancellationToken);

    Task<HouseholdSummary> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<ChoreTemplate>> GetTemplatesAsync(CancellationToken cancellationToken);

    Task<ChoreTemplate> CreateTemplateAsync(CreateChoreTemplateRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<ChoreInstance>> GetInstancesAsync(CancellationToken cancellationToken);

    Task<DashboardSummary> GetDashboardSummaryAsync(CancellationToken cancellationToken);
}
