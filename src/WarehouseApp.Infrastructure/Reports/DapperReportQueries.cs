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
    public async Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default)
    {
        // Low stock is now per-product: flag active products at or below their own
        // warning_stock threshold, most-urgent (largest shortfall) first.
        const string sql = """
            select id            as product_id,
                   sku,
                   name,
                   in_stock,
                   warning_stock
            from product
            where status = 1
              and in_stock <= warning_stock
            order by (warning_stock - in_stock) desc, sku asc;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<LowStockItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        const string sql = """
            select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as date,
                   count(*)                              as invoice_count,
                   coalesce(sum(total), 0)               as total
            from invoice
            where created_at >= (cast(@from as timestamp) at time zone 'Asia/Ho_Chi_Minh')
              and created_at < ((cast(@to as timestamp) + interval '1 day') at time zone 'Asia/Ho_Chi_Minh')
            group by (created_at at time zone 'Asia/Ho_Chi_Minh')::date
            order by (created_at at time zone 'Asia/Ho_Chi_Minh')::date;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<SalesSummaryRowDto>(new CommandDefinition(
            sql, new { from, to }, cancellationToken: ct));
        return rows.AsList();
    }
}
