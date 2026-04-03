using TaskBandit.Api.Contracts;
using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class BootstrapEndpoints
{
    public static IEndpointRouteBuilder MapBootstrapEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/bootstrap");

        group.MapGet("/status", async (
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
            Results.Ok(await repository.GetBootstrapStatusAsync(cancellationToken)));

        group.MapPost("/household", async (
            BootstrapHouseholdRequest request,
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
        {
            var status = await repository.GetBootstrapStatusAsync(cancellationToken);
            if (status.IsBootstrapped)
            {
                return Results.Conflict(new
                {
                    message = "TaskBandit already has an initialized household."
                });
            }

            var household = await repository.BootstrapHouseholdAsync(request, cancellationToken);
            return Results.Created($"/api/settings/household", household);
        });

        return app;
    }
}

