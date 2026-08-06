using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IAuthService
{
    /// <summary>Verifies credentials against the account store. Returns null for unknown
    /// username, inactive account, or wrong password (callers must not distinguish which).</summary>
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);
}
