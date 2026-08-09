using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;
using WarehouseApp.Api.Security;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/auth").WithTags("Auth");

        g.MapPost("/login", async (
            LoginRequest req,
            IAuthService auth,
            IJwtTokenService tokens,
            CancellationToken ct) =>
            await auth.LoginAsync(req, ct) is { } session
                ? Results.Ok(tokens.Issue(session))
                : Results.Problem(detail: "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa tạm thời.", statusCode: 401))
            .RequireRateLimiting("AuthLogin");

        g.MapPost("/refresh", async (
            RefreshRequest req,
            IAuthService auth,
            IJwtTokenService tokens,
            CancellationToken ct) =>
            await auth.RefreshAsync(req.RefreshToken, ct) is { } session
                ? Results.Ok(tokens.Issue(session))
                : Results.Problem(detail: "Phiên đăng nhập không còn hợp lệ.", statusCode: 401));

        g.MapPost("/logout", async (
            ClaimsPrincipal user,
            IAuthService auth,
            CancellationToken ct) =>
        {
            if (!TryGetSessionIdentity(user, out var sessionId, out var accountId))
                return Results.Unauthorized();

            await auth.RevokeSessionAsync(sessionId, accountId, ct);
            return Results.NoContent();
        }).RequireAuthorization();

        g.MapPost("/change-password", async (
            ChangePasswordRequest req,
            ClaimsPrincipal user,
            IAuthService auth,
            IJwtTokenService tokens,
            CancellationToken ct) =>
        {
            if (!TryGetSessionIdentity(user, out var sessionId, out var accountId))
                return Results.Unauthorized();

            var session = await auth.ChangePasswordAsync(sessionId, accountId, req, ct);
            return Results.Ok(tokens.Issue(session));
        }).RequireAuthorization();

        g.MapGet("/me", (ClaimsPrincipal user) =>
        {
            if (!long.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out var accountId) ||
                !short.TryParse(user.FindFirstValue("role_id"), out var roleId))
                return Results.Unauthorized();

            return Results.Ok(new CurrentUserResponse(
                accountId,
                user.FindFirstValue(JwtRegisteredClaimNames.UniqueName) ?? user.Identity?.Name ?? string.Empty,
                roleId,
                user.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
                string.Equals(user.FindFirstValue("must_change_password"), "true", StringComparison.Ordinal)));
        }).RequireAuthorization();

        return api;
    }

    private static bool TryGetSessionIdentity(ClaimsPrincipal user, out Guid sessionId, out long accountId)
    {
        sessionId = default;
        accountId = default;
        return Guid.TryParse(user.FindFirstValue("sid"), out sessionId) &&
               long.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out accountId);
    }
}
