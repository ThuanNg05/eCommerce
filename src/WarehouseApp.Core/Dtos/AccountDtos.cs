namespace WarehouseApp.Core.Dtos;

/// <summary>A login account. The password hash is never exposed. <see cref="Role"/> is the
/// string form of <see cref="RoleId"/> (1=Admin, 2=Staff) for the UI's convenience.</summary>
public record AccountDto(
    long Id,
    string Username,
    short RoleId,
    string Role,
    short Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record CreateAccountRequest(
    string Username,
    string Password,
    short RoleId);

/// <summary>Username is immutable. <see cref="Password"/> is optional — leave it null/blank to
/// keep the current password, or supply a new one to reset it.</summary>
public record UpdateAccountRequest(
    short RoleId,
    short Status,
    string? Password);
