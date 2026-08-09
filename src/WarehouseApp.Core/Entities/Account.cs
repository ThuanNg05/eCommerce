namespace WarehouseApp.Core.Entities;

/// <summary>A login account. <see cref="RoleId"/> distinguishes staff (operational)
/// from system admin (configuration/reporting); see FR001.</summary>
public class Account
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public short RoleId { get; set; }
    public short Status { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<AuthSession> AuthSessions { get; set; } = [];
}
