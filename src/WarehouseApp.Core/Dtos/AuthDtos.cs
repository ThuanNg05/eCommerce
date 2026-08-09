namespace WarehouseApp.Core.Dtos;

public record LoginRequest(string Username, string Password);

public record RefreshRequest(string RefreshToken);

public record AuthenticatedSession(
    Guid SessionId,
    long Id,
    string Username,
    short RoleId,
    string Role,
    string RefreshToken,
    DateTimeOffset SessionExpiresAt);

public record LoginResponse(
    long Id,
    string Username,
    short RoleId,
    string Role,
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessTokenExpiresAt,
    DateTimeOffset SessionExpiresAt);

public record CurrentUserResponse(long Id, string Username, short RoleId, string Role);
