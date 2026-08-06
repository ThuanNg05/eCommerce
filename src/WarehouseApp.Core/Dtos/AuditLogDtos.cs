namespace WarehouseApp.Core.Dtos;

/// <summary>A change-audit row. <see cref="OldValues"/>/<see cref="NewValues"/> are the raw
/// jsonb snapshots as stored; <see cref="Action"/> is a single letter (I/U/D).</summary>
public record AuditLogDto(
    long Id,
    string TableName,
    string RecordId,
    string Action,
    string? OldValues,
    string? NewValues,
    long? ChangedBy,
    DateTimeOffset ChangedAt);
