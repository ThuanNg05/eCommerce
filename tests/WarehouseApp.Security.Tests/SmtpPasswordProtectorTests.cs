using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Infrastructure.Data;
using WarehouseApp.Infrastructure.Security;
using WarehouseApp.Infrastructure.Services;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class SmtpPasswordProtectorTests
{
    private static readonly string TestKey =
        Convert.ToBase64String(Enumerable.Range(1, 32).Select(i => (byte)i).ToArray());

    [Fact]
    public void Protect_DoesNotStorePlaintext_AndRoundTrips()
    {
        const string password = "smtp-app-password-123";
        var protector = new SmtpPasswordProtector(TestKey);

        var protectedValue = protector.Protect(password);

        Assert.StartsWith("smtp:v1:", protectedValue, StringComparison.Ordinal);
        Assert.DoesNotContain(password, protectedValue, StringComparison.Ordinal);
        Assert.Equal(password, protector.Unprotect(protectedValue));
    }

    [Fact]
    public void Protect_UsesANewNonceForEveryWrite()
    {
        var protector = new SmtpPasswordProtector(TestKey);

        var first = protector.Protect("same-password");
        var second = protector.Protect("same-password");

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Unprotect_RejectsTamperedCiphertext()
    {
        var protector = new SmtpPasswordProtector(TestKey);
        var protectedValue = protector.Protect("smtp-app-password");
        var payload = Convert.FromBase64String(protectedValue["smtp:v1:".Length..]);
        payload[^1] ^= 0x01;
        var tampered = "smtp:v1:" + Convert.ToBase64String(payload);

        Assert.ThrowsAny<CryptographicException>(() => protector.Unprotect(tampered));
    }

    [Fact]
    public void Protect_RejectsMissingOrInvalidKey()
    {
        Assert.Throws<InvalidOperationException>(() => new SmtpPasswordProtector(null).Protect("password"));
        Assert.Throws<InvalidOperationException>(() => new SmtpPasswordProtector("not-base64").Protect("password"));
        Assert.Throws<InvalidOperationException>(() =>
            new SmtpPasswordProtector(Convert.ToBase64String(new byte[16])).Protect("password"));
    }

    [Fact]
    public async Task SettingsService_PersistsOnlyCiphertext_AndKeepsItWhenPasswordIsBlank()
    {
        var databaseName = $"smtp-protection-{Guid.NewGuid():N}";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var protector = new SmtpPasswordProtector(TestKey);

        await using (var writeDb = new AppDbContext(options))
        {
            var service = new SettingsService(writeDb, protector);
            await service.UpdateSmtpAsync(
                new UpdateSmtpConfigRequest("owner@example.com", "smtp-secret", null));
        }

        string storedCiphertext;
        await using (var readDb = new AppDbContext(options))
        {
            var stored = await readDb.SmtpConfigs.SingleAsync();
            storedCiphertext = stored.ProtectedPassApp;
            Assert.NotEqual("smtp-secret", storedCiphertext);
            Assert.Equal("smtp-secret", protector.Unprotect(storedCiphertext));

            var service = new SettingsService(readDb, protector);
            var response = await service.UpdateSmtpAsync(
                new UpdateSmtpConfigRequest("new@example.com", " ", null));

            Assert.True(response.HasPassword);
        }

        await using var verifyDb = new AppDbContext(options);
        Assert.Equal(storedCiphertext, (await verifyDb.SmtpConfigs.SingleAsync()).ProtectedPassApp);
    }
}
