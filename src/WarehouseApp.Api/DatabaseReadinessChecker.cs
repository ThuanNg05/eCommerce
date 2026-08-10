using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Api;

public sealed class DatabaseReadinessOptions
{
    public const string SectionName = "DatabaseReadiness";

    public string RequiredSchemaVersion { get; set; } = string.Empty;
}

public sealed record DatabaseReadinessResult(
    bool IsReady,
    string Code,
    string RequiredSchemaVersion,
    string? ActualSchemaVersion);

/// <summary>
/// Confirms that PostgreSQL is reachable and has the schema version required by
/// this application build. Error details are intentionally not returned because
/// connection failures can contain host or credential information.
/// </summary>
public sealed class DatabaseReadinessChecker(
    AppDbContext db,
    IOptions<DatabaseReadinessOptions> options)
{
    public async Task<DatabaseReadinessResult> CheckAsync(CancellationToken ct = default)
    {
        var required = options.Value.RequiredSchemaVersion?.Trim() ?? string.Empty;
        if (required.Length == 0)
            return new(false, "required_schema_version_missing", string.Empty, null);

        var connection = db.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;

        try
        {
            if (openedHere)
                await connection.OpenAsync(ct);

            await using var command = connection.CreateCommand();
            command.CommandText = "select version from public.app_schema_version where id = 1";
            var actual = (await command.ExecuteScalarAsync(ct))?.ToString();

            return string.Equals(actual, required, StringComparison.Ordinal)
                ? new(true, "ready", required, actual)
                : new(false, "schema_version_mismatch", required, actual);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            return new(false, "database_or_schema_unavailable", required, null);
        }
        finally
        {
            if (openedHere && connection.State != ConnectionState.Closed)
                await connection.CloseAsync();
        }
    }
}
