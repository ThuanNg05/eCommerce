using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;

namespace WarehouseApp.Api.Endpoints;

public static class ReportEndpoints
{
    public static RouteGroupBuilder MapReportEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/reports").WithTags("Reports");

        g.MapGet("/low-stock", async (IReportQueries q, CancellationToken ct) =>
            Results.Ok(await q.GetLowStockAsync(ct)));

        g.MapGet("/sales-summary", async (DateOnly? from, DateOnly? to, IReportQueries q, CancellationToken ct) =>
        {
            var t = to ?? VietnamBusinessTime.Today;
            var f = from ?? t.AddDays(-30);
            return Results.Ok(await q.GetSalesSummaryAsync(f, t, ct));
        });

        return api;
    }
}
