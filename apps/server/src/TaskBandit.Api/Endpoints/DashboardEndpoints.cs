using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dashboard/summary", async (
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
            Results.Ok(await repository.GetDashboardSummaryAsync(cancellationToken)));

        return app;
    }
}
