namespace WarehouseApp.Core.Entities;

/// <summary>
/// Generic change-audit row written by database triggers on pricing, invoices, and
/// accounts (NFR: auditability). <see cref="OldValues"/>/<see cref="NewValues"/> hold the
/// row as jsonb; <see cref="ChangedBy"/> is populated from the session's app.current_account_id.
/// </summary>
public class AuditLog
{
    public long Id { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RecordId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public long? ChangedBy { get; set; }
    public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.UtcNow;
}
