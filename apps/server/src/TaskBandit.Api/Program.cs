using Microsoft.AspNetCore.HttpOverrides;
using TaskBandit.Api.Configuration;
using TaskBandit.Api.Endpoints;
using TaskBandit.Api.Gamification;
using TaskBandit.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<InMemoryTaskBanditStore>();
builder.Services.AddSingleton<PointsCalculator>();
builder.Services.Configure<ReverseProxyOptions>(
    builder.Configuration.GetSection(ReverseProxyOptions.SectionName));
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // Reverse proxy addresses are environment-specific, so we allow them to be
    // configured externally rather than hardcoding trusted hops in the scaffold.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

var reverseProxyOptions = app.Configuration
    .GetSection(ReverseProxyOptions.SectionName)
    .Get<ReverseProxyOptions>();

if (reverseProxyOptions?.Enabled == true)
{
    app.UseForwardedHeaders();

    if (!string.IsNullOrWhiteSpace(reverseProxyOptions.PathBase))
    {
        app.UsePathBase(reverseProxyOptions.PathBase);
    }
}

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
