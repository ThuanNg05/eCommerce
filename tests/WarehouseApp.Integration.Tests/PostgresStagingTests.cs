using Npgsql;
using Xunit;

namespace WarehouseApp.Integration.Tests;

public sealed class PostgresStagingTests
{
    private static string ConnectionString =>
        Environment.GetEnvironmentVariable("WAREHOUSE_INTEGRATION_CONNECTION")
        ?? throw new InvalidOperationException(
            "WAREHOUSE_INTEGRATION_CONNECTION must point to an isolated staging database.");

    [Fact]
    public async Task StagingConnectionUsesValidatedTlsAndExpectedSchemaVersion()
    {
        var builder = new NpgsqlConnectionStringBuilder(ConnectionString);
        var allowInsecureLocal = string.Equals(
            Environment.GetEnvironmentVariable("WAREHOUSE_INTEGRATION_ALLOW_INSECURE_LOCAL"),
            "true",
            StringComparison.OrdinalIgnoreCase);
        var isLocal = builder.Host is "127.0.0.1" or "localhost" && builder.Port == 54322;

        if (allowInsecureLocal)
        {
            Assert.True(isLocal, "Insecure integration mode is only allowed for Supabase local on port 54322.");
            Assert.Equal(SslMode.Disable, builder.SslMode);
        }
        else
        {
            Assert.Equal(SslMode.VerifyFull, builder.SslMode);
        }

        await using var connection = new NpgsqlConnection(builder.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "select version from public.app_schema_version limit 1", connection);
        var version = (string?)await command.ExecuteScalarAsync();

        Assert.Equal("20260818093833", version);
    }

    [Fact]
    public async Task StagingCanRollbackATransactionalProbe()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var create = new NpgsqlCommand(
            "create temp table integration_rollback_probe (value integer)", connection);
        await create.ExecuteNonQueryAsync();

        await using var tx = await connection.BeginTransactionAsync();
        await using var insert = new NpgsqlCommand(
            "insert into integration_rollback_probe(value) values (1)", connection, tx);
        await insert.ExecuteNonQueryAsync();
        await tx.RollbackAsync();

        await using var check = new NpgsqlCommand(
            "select count(*) from integration_rollback_probe", connection);
        Assert.Equal(0L, await check.ExecuteScalarAsync());

        await using var drop = new NpgsqlCommand(
            "drop table integration_rollback_probe", connection);
        await drop.ExecuteNonQueryAsync();
    }
}
