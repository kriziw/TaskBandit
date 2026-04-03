using TaskBandit.Api.Domain;
using TaskBandit.Api.Gamification;

namespace TaskBandit.Api.Endpoints;

public static class GamificationEndpoints
{
    public static IEndpointRouteBuilder MapGamificationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
            "/api/gamification/preview",
            (Difficulty difficulty, int checklistItems, bool isOverdue, PointsCalculator calculator) =>
                Results.Ok(calculator.CalculateForApprovedCompletion(difficulty, checklistItems, isOverdue)));

        return app;
    }
}

