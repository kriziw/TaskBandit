using TaskBandit.Api.Contracts;
using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class ChoreEndpoints
{
    public static IEndpointRouteBuilder MapChoreEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/chores");

        group.MapGet("/templates", (InMemoryTaskBanditStore store) =>
            Results.Ok(store.GetTemplates()));

        group.MapPost("/templates", (CreateChoreTemplateRequest request, InMemoryTaskBanditStore store) =>
        {
            var template = store.CreateTemplate(request);
            return Results.Created($"/api/chores/templates/{template.Id}", template);
        });

        group.MapGet("/instances", (InMemoryTaskBanditStore store) =>
            Results.Ok(store.GetInstances()));

        return app;
    }
}
