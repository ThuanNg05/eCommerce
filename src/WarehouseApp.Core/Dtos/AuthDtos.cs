namespace WarehouseApp.Core.Dtos;

public record LoginRequest(string Username, string Password);

public record RefreshRequest(string RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AuthenticatedSession(
    Guid SessionId,
    long Id,
    string Username,
    short RoleId,
    string Role,
    bool MustChangePassword,
    string RefreshToken,
    DateTimeOffset SessionExpiresAt);

public record LoginResponse(
    long Id,
    string Username,
    short RoleId,
    string Role,
    string AccessToken,
    string RefreshToken,
    bool MustChangePassword,
    DateTimeOffset AccessTokenExpiresAt,
    DateTimeOffset SessionExpiresAt);

public record CurrentUserResponse(
    long Id,
    string Username,
    short RoleId,
    string Role,
    bool MustChangePassword);
