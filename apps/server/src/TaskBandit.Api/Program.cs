using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using TaskBandit.Api.Configuration;
using TaskBandit.Api.Endpoints;
using TaskBandit.Api.Gamification;
using TaskBandit.Api.Persistence;
using TaskBandit.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("TaskBandit")
    ?? throw new InvalidOperationException("Connection string 'TaskBandit' is not configured.");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<TaskBanditDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddSingleton<PointsCalculator>();
builder.Services.AddScoped<ITaskBanditRepository, TaskBanditRepository>();
builder.Services.AddScoped<TaskBanditDbSeeder>();
builder.Services.Configure<BootstrapOptions>(
    builder.Configuration.GetSection(BootstrapOptions.SectionName));
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

using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<TaskBanditDbSeeder>();
    var dbContext = scope.ServiceProvider.GetRequiredService<TaskBanditDbContext>();
    await seeder.SeedAsync(dbContext, CancellationToken.None);
}

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
app.MapBootstrapEndpoints();
app.MapDashboardEndpoints();
app.MapGamificationEndpoints();
app.MapSettingsEndpoints();
app.MapChoreEndpoints();

app.Run();
