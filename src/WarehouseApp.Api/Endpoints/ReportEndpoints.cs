using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class ReportEndpoints
{
    public static RouteGroupBuilder MapReportEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/reports").WithTags("Reports");

        g.MapGet("/low-stock", async (IReportQueries q, CancellationToken ct) =>
            Results.Ok(await q.GetLowStockAsync(ct)));

        g.MapGet("/sales-overview", async (
            DateOnly? from, DateOnly? to, long? categoryId, long? productId, long? customerId,
            string? groupPrice, string? search, IReportQueries q, CancellationToken ct) =>
        {
            var parsed = ParseSalesFilter(from, to, categoryId, productId, customerId, groupPrice, search);
            return parsed.Error is not null ? parsed.Error : Results.Ok(await q.GetSalesOverviewAsync(parsed.Filter!, ct));
        });

        g.MapGet("/sales-summary", async (
            DateOnly? from, DateOnly? to, string? groupBy, long? categoryId, long? productId, long? customerId,
            string? groupPrice, string? search, IReportQueries q, CancellationToken ct) =>
        {
            var parsed = ParseSalesFilter(from, to, categoryId, productId, customerId, groupPrice, search);
            if (parsed.Error is not null) return parsed.Error;

            var normalizedGroupBy = (groupBy ?? "day").Trim().ToLowerInvariant();
            if (normalizedGroupBy is not ("day" or "week" or "month"))
                return Results.Problem(detail: "groupBy chỉ nhận day, week hoặc month.", statusCode: 400);

            return Results.Ok(await q.GetSalesSummaryAsync(parsed.Filter!, normalizedGroupBy, ct));
        });

        g.MapGet("/top-products", async (
            DateOnly? from, DateOnly? to, int? limit, long? categoryId, long? productId, long? customerId,
            string? groupPrice, string? search, IReportQueries q, CancellationToken ct) =>
        {
            var parsed = ParseSalesFilter(from, to, categoryId, productId, customerId, groupPrice, search);
            return parsed.Error is not null ? parsed.Error : Results.Ok(await q.GetTopProductsAsync(parsed.Filter!, Math.Clamp(limit ?? 10, 1, 50), ct));
        });

        g.MapGet("/top-customers", async (
            DateOnly? from, DateOnly? to, int? limit, long? categoryId, long? productId, long? customerId,
            string? groupPrice, string? search, IReportQueries q, CancellationToken ct) =>
        {
            var parsed = ParseSalesFilter(from, to, categoryId, productId, customerId, groupPrice, search);
            return parsed.Error is not null ? parsed.Error : Results.Ok(await q.GetTopCustomersAsync(parsed.Filter!, Math.Clamp(limit ?? 10, 1, 50), ct));
        });

        g.MapGet("/inventory-flow", async (
            DateOnly? from, DateOnly? to, short? transactionType, string? itemType, IReportQueries q, CancellationToken ct) =>
        {
            var range = ParseDateRange(from, to);
            if (range.Error is not null) return range.Error;
            if (transactionType is not null && transactionType is not (1 or 2))
                return Results.Problem(detail: "transactionType chỉ nhận 1 (Nhập) hoặc 2 (Xuất).", statusCode: 400);

            var normalizedItemType = string.IsNullOrWhiteSpace(itemType) ? null : itemType.Trim().ToLowerInvariant();
            if (normalizedItemType is not null && normalizedItemType is not ("product" or "backboard" or "material" or "sub-backboard"))
                return Results.Problem(detail: "itemType chỉ nhận product, backboard, material hoặc sub-backboard.", statusCode: 400);

            return Results.Ok(await q.GetInventoryFlowAsync(range.From, range.To, transactionType, normalizedItemType, ct));
        });

        g.MapGet("/invoice-details", async (
            DateOnly? from, DateOnly? to, int? page, int? pageSize, long? categoryId, long? productId, long? customerId,
            string? groupPrice, string? search, IReportQueries q, CancellationToken ct) =>
        {
            var parsed = ParseSalesFilter(from, to, categoryId, productId, customerId, groupPrice, search);
            return parsed.Error is not null
                ? parsed.Error
                : Results.Ok(await q.GetInvoiceDetailsAsync(parsed.Filter!, page ?? 1, pageSize ?? 50, ct));
        });

        return api;
    }

    private static (SalesReportFilter? Filter, IResult? Error) ParseSalesFilter(
        DateOnly? from, DateOnly? to, long? categoryId, long? productId, long? customerId, string? groupPrice, string? search)
    {
        var range = ParseDateRange(from, to);
        if (range.Error is not null) return (null, range.Error);

        var normalizedGroupPrice = string.IsNullOrWhiteSpace(groupPrice) ? null : groupPrice.Trim().ToUpperInvariant();
        if (normalizedGroupPrice is not null && normalizedGroupPrice is not ("L" or "S"))
            return (null, Results.Problem(detail: "groupPrice chỉ nhận L (Lẻ) hoặc S (Sỉ).", statusCode: 400));

        return (new SalesReportFilter(range.From, range.To, categoryId, productId, customerId, normalizedGroupPrice, search?.Trim()), null);
    }

    private static (DateOnly From, DateOnly To, IResult? Error) ParseDateRange(DateOnly? from, DateOnly? to)
    {
        var end = to ?? VietnamBusinessTime.Today;
        var start = from ?? end.AddDays(-30);
        if (start > end)
            return (default, default, Results.Problem(detail: "Ngày bắt đầu không được sau ngày kết thúc.", statusCode: 400));
        if (end.DayNumber - start.DayNumber > 731)
            return (default, default, Results.Problem(detail: "Khoảng thời gian lọc tối đa là 24 tháng.", statusCode: 400));
        return (start, end, null);
    }
}
