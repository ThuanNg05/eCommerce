using System.Security.Cryptography;
using System.Text;
using WarehouseApp.Infrastructure.Services;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class WooCommerceWebhookSignatureTests
{
    [Fact]
    public void IsValid_MatchingHmacSha256_ReturnsTrue()
    {
        var secret = "webhook-secret";
        var payload = Encoding.UTF8.GetBytes("{\"id\":42}");
        var signature = Convert.ToBase64String(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), payload));

        Assert.True(WooCommerceWebhookSignature.IsValid(secret, signature, payload));
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("")]
    public void IsValid_InvalidSignature_ReturnsFalse(string signature)
    {
        Assert.False(WooCommerceWebhookSignature.IsValid("webhook-secret", signature, Encoding.UTF8.GetBytes("{}")));
    }
}
