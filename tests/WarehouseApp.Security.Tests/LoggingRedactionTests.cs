using Microsoft.Extensions.Logging;
using WarehouseApp.Api.Logging;
using Xunit;

namespace WarehouseApp.Security.Tests;

public sealed class LoggingRedactionTests
{
    [Fact]
    public void StructuredLogRedactsCredentialsTokensAndCustomerPii()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"warehouse-logs-{Guid.NewGuid():N}");
        try
        {
            using var provider = new RollingFileLoggerProvider(directory, 1024 * 1024, 2);
            var logger = provider.CreateLogger("security-test");

            logger.LogInformation(
                "password=plain-password token=plain-token Authorization: Bearer jwt-value phone=0901234567 address=private-address");

            var line = File.ReadAllText(Directory.GetFiles(directory, "app-*.jsonl").Single());
            Assert.DoesNotContain("plain-password", line, StringComparison.Ordinal);
            Assert.DoesNotContain("plain-token", line, StringComparison.Ordinal);
            Assert.DoesNotContain("jwt-value", line, StringComparison.Ordinal);
            Assert.DoesNotContain("0901234567", line, StringComparison.Ordinal);
            Assert.DoesNotContain("private-address", line, StringComparison.Ordinal);
            Assert.Contains("[REDACTED]", line, StringComparison.Ordinal);
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        }
    }
}
