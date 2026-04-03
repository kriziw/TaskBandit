namespace TaskBandit.Api.Configuration;

public sealed class BootstrapOptions
{
    public const string SectionName = "TaskBandit:Bootstrap";

    public bool SeedDemoData { get; init; }
}

