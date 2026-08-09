namespace WarehouseApp.Core.Entities;

/// <summary>
/// A server-side login session. Access JWTs reference <see cref="Id"/> through
/// their sid claim; revoking this row invalidates the JWT immediately.
/// </summary>
public class AuthSession
{
    public Guid Id { get; set; }
    public long AccountId { get; set; }
    public string RefreshTokenHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }

    public Account Account { get; set; } = null!;
}
