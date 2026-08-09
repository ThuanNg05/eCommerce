namespace WarehouseApp.Core.Security;

public sealed class AuthSettings
{
    public const string SectionName = "Authentication";

    public string Issuer { get; set; } = "WarehouseApp";
    public string Audience { get; set; } = "WarehouseApp.Client";
    public int AccessTokenMinutes { get; set; } = 15;
    public int SessionHours { get; set; } = 8;
}
