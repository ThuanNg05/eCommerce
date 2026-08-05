using Dapper;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Reports;

/// <summary>
/// Raw-SQL report queries (Dapper). Column aliases are snake_case to line up with
/// <c>DefaultTypeMap.MatchNamesWithUnderscores = true</c> (configured in DI), which
/// maps e.g. <c>in_stock</c> to <c>InStock</c>.
/// </summary>
public class DapperReportQueries(IDbConnectionFactory factory) : IReportQueries
{
    /// <summary>The schema has no per-product reorder level, so "low stock" is a fixed
    /// house threshold. Adjust here (or promote to a parameter/column) if needed.</summary>
    private const int LowStockThreshold = 5;

    public async Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default)
    {
        const string sql = """
            select id       as product_id,
                   sku,
                   name,
                   in_stock
            from product
            where status = 1
              and in_stock <= @threshold
            order by in_stock asc, sku asc;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<LowStockItemDto>(new CommandDefinition(
            sql, new { threshold = LowStockThreshold }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        const string sql = """
            select (created_at at time zone 'UTC')::date as date,
                   count(*)                              as invoice_count,
                   coalesce(sum(total), 0)               as total
            from invoice
            where (created_at at time zone 'UTC')::date between @from and @to
            group by (created_at at time zone 'UTC')::date
            order by (created_at at time zone 'UTC')::date;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<SalesSummaryRowDto>(new CommandDefinition(
            sql, new { from, to }, cancellationToken: ct));
        return rows.AsList();
    }
}
