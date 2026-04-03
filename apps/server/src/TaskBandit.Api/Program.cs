using TaskBandit.Api.Endpoints;
using TaskBandit.Api.Gamification;
using TaskBandit.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<InMemoryTaskBanditStore>();
builder.Services.AddSingleton<PointsCalculator>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/", () => Results.Ok(new
{
    name = "TaskBandit API",
    status = "ok",
    version = "0.1.0"
}));

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapDashboardEndpoints();
app.MapGamificationEndpoints();
app.MapSettingsEndpoints();
app.MapChoreEndpoints();

app.Run();
