using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Security;

namespace WarehouseApp.Api.Security;

public sealed record JwtSigningKey(SecurityKey Key);

public interface IJwtTokenService
{
    LoginResponse Issue(AuthenticatedSession session);
}

public sealed class JwtTokenService(
    JwtSigningKey signingKey,
    IOptions<AuthSettings> authOptions) : IJwtTokenService
{
    private readonly AuthSettings _settings = authOptions.Value;

    public LoginResponse Issue(AuthenticatedSession session)
    {
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(_settings.AccessTokenMinutes);
        if (expiresAt > session.SessionExpiresAt)
            expiresAt = session.SessionExpiresAt;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, session.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, session.Username),
            new Claim(ClaimTypes.Name, session.Username),
            new Claim(ClaimTypes.Role, session.Role),
            new Claim("role_id", session.RoleId.ToString()),
            new Claim("sid", session.SessionId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: new SigningCredentials(signingKey.Key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse(
            session.Id,
            session.Username,
            session.RoleId,
            session.Role,
            new JwtSecurityTokenHandler().WriteToken(token),
            session.RefreshToken,
            expiresAt,
            session.SessionExpiresAt);
    }
}
