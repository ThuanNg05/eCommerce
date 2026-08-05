namespace WarehouseApp.Core.Entities;

/// <summary>Singleton email-integration configuration (FR012). Exactly one row (Id = 1).</summary>
public class SmtpConfig
{
    public short Id { get; set; } = 1;
    public string Address { get; set; } = string.Empty;
    public string HashedPassApp { get; set; } = string.Empty;
    public DateOnly? Duration { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
