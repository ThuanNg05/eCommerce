using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

/// <summary>
/// Read-only reporting hot-paths served by Dapper (raw SQL) rather than EF Core,
/// per the stack decision to use Dapper for report aggregation.
/// </summary>
public interface IReportQueries
{
    Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default);
    Task<SalesOverviewDto> GetSalesOverviewAsync(SalesReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(SalesReportFilter filter, string groupBy, CancellationToken ct = default);
    Task<IReadOnlyList<TopProductDto>> GetTopProductsAsync(SalesReportFilter filter, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(SalesReportFilter filter, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<InventoryFlowRowDto>> GetInventoryFlowAsync(DateOnly from, DateOnly to, short? transactionType, string? itemType, CancellationToken ct = default);
    Task<PagedResult<InvoiceReportRowDto>> GetInvoiceDetailsAsync(SalesReportFilter filter, int page, int pageSize, CancellationToken ct = default);
}
