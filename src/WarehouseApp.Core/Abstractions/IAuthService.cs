using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IAuthService
{
    Task<AuthenticatedSession?> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthenticatedSession?> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task<AuthenticatedSession> ChangePasswordAsync(
        Guid sessionId,
        long accountId,
        ChangePasswordRequest request,
        CancellationToken ct = default);
    Task<bool> ValidateSessionAsync(Guid sessionId, long accountId, CancellationToken ct = default);
    Task RevokeSessionAsync(Guid sessionId, long accountId, CancellationToken ct = default);
}
