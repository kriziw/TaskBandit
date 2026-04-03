namespace TaskBandit.Api.Configuration;

public sealed class ReverseProxyOptions
{
    public const string SectionName = "TaskBandit:ReverseProxy";

    public bool Enabled { get; init; }

    public string? PathBase { get; init; }
}

