namespace WarehouseApp.Core.Dtos;

/// <summary>Email-integration settings (FR012). The stored app password is never echoed
/// back — only <see cref="HasPassword"/> signals whether one is set.</summary>
public record SmtpConfigDto(
    string Address,
    bool HasPassword,
    DateOnly? Duration,
    DateTimeOffset UpdatedAt);

/// <summary><see cref="AppPassword"/> is optional: leave it null/blank to keep the currently
/// stored password, or supply a new one to replace it.</summary>
public record UpdateSmtpConfigRequest(
    string Address,
    string? AppPassword,
    DateOnly? Duration);
