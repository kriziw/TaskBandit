using TaskBandit.Api.Contracts;
using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class ChoreEndpoints
{
    public static IEndpointRouteBuilder MapChoreEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/chores");

        group.MapGet("/templates", async (
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
            Results.Ok(await repository.GetTemplatesAsync(cancellationToken)));

        group.MapPost("/templates", async (
            CreateChoreTemplateRequest request,
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
        {
            var template = await repository.CreateTemplateAsync(request, cancellationToken);
            return Results.Created($"/api/chores/templates/{template.Id}", template);
        });

        group.MapGet("/instances", async (
            ITaskBanditRepository repository,
            CancellationToken cancellationToken) =>
            Results.Ok(await repository.GetInstancesAsync(cancellationToken)));

        return app;
    }
}
