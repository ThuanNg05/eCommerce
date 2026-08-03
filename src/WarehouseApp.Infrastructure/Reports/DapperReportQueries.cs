using Dapper;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Enums;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Reports;

/// <summary>
/// Raw-SQL report queries (Dapper). Column aliases are snake_case to line up with
/// <c>DefaultTypeMap.MatchNamesWithUnderscores = true</c> (configured in DI), which
/// maps e.g. <c>quantity_on_hand</c> to <c>QuantityOnHand</c>.
/// </summary>
public class DapperReportQueries(IDbConnectionFactory factory) : IReportQueries
{
    public async Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default)
    {
        const string sql = """
            select id            as product_id,
                   sku,
                   name,
                   quantity_on_hand,
                   reorder_level
            from products
            where is_active = true
              and quantity_on_hand <= reorder_level
            order by quantity_on_hand asc, sku asc;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<LowStockItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        const string sql = """
            select (issued_at at time zone 'UTC')::date as date,
                   count(*)                             as invoice_count,
                   coalesce(sum(total), 0)              as total
            from invoices
            where status = @status
              and issued_at is not null
              and (issued_at at time zone 'UTC')::date between @from and @to
            group by (issued_at at time zone 'UTC')::date
            order by (issued_at at time zone 'UTC')::date;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<SalesSummaryRowDto>(new CommandDefinition(
            sql,
            new { status = (int)InvoiceStatus.Issued, from, to },
            cancellationToken: ct));
        return rows.AsList();
    }
}
