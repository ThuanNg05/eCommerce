using WarehouseApp.Core.Abstractions;

namespace WarehouseApp.Api.Endpoints;

public static class AuditLogEndpoints
{
    public static RouteGroupBuilder MapAuditLogEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/audit").WithTags("Audit");

        g.MapGet("/", async (IAuditLogService svc, int? page, int? pageSize, string? table, string? action, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, table, action, search, ct)));

        return api;
    }
}
