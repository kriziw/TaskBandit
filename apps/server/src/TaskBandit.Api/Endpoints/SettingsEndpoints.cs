using TaskBandit.Api.Contracts;
using TaskBandit.Api.Services;

namespace TaskBandit.Api.Endpoints;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings");

        group.MapGet("/household", (InMemoryTaskBanditStore store) =>
            Results.Ok(store.GetHousehold()));

        group.MapPut("/household", (UpdateSettingsRequest request, InMemoryTaskBanditStore store) =>
            Results.Ok(store.UpdateSettings(request)));

        return app;
    }
}

