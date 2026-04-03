using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dashboard/summary", (InMemoryTaskBanditStore store) =>
            Results.Ok(store.GetDashboardSummary()));

        return app;
    }
}

