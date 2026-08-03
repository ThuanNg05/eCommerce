using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

/// <summary>
/// Read-only reporting hot-paths served by Dapper (raw SQL) rather than EF Core,
/// per the stack decision to use Dapper for report aggregation.
/// </summary>
public interface IReportQueries
{
    Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
}
