namespace WarehouseApp.Core.Dtos;

public record LoginRequest(string Username, string Password);

/// <summary>Returned on a successful login. There is no token — the in-process desktop app
/// uses the returned <see cref="Role"/> to gate the UI.</summary>
public record LoginResponse(long Id, string Username, short RoleId, string Role);
