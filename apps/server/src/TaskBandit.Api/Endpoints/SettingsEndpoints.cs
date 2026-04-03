using TaskBandit.Api.Contracts;
using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings");

        group.MapGet("/household", async (ITaskBanditRepository repository, CancellationToken cancellationToken) =>
            Results.Ok(await repository.GetHouseholdAsync(cancellationToken)));

        group.MapPut("/household", async (
            UpdateSettingsRequest request,
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
            Results.Ok(await repository.UpdateSettingsAsync(request, cancellationToken)));

        return app;
    }
}
