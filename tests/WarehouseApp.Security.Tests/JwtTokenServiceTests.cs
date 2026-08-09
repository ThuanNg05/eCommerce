using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WarehouseApp.Api.Security;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Security;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class JwtTokenServiceTests
{
    [Fact]
    public void Issue_IncludesPasswordChangeAndSessionClaims()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-signing-key-with-at-least-32-bytes"));
        var service = new JwtTokenService(
            new JwtSigningKey(key),
            Options.Create(new AuthSettings()));
        var sessionId = Guid.NewGuid();
        var session = new AuthenticatedSession(
            sessionId,
            42,
            "admin",
            1,
            "Admin",
            true,
            "refresh-token",
            DateTimeOffset.UtcNow.AddHours(1));

        var response = service.Issue(session);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);

        Assert.True(response.MustChangePassword);
        Assert.Equal(sessionId.ToString(), jwt.Claims.Single(c => c.Type == "sid").Value);
        Assert.Equal("true", jwt.Claims.Single(c => c.Type == "must_change_password").Value);
    }

    [Fact]
    public void SigningKeyStore_UsesConfiguredSecretWithoutWritingAFile()
    {
        var configured = new string('k', 32);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:SigningKey"] = configured,
            })
            .Build();

        Assert.Equal(Encoding.UTF8.GetBytes(configured), JwtSigningKeyStore.Resolve(config));
    }
}
