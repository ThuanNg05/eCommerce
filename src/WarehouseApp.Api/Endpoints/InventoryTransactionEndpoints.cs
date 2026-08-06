using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class InventoryTransactionEndpoints
{
    public static RouteGroupBuilder MapInventoryTransactionEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/inventory-transactions").WithTags("InventoryTransactions");

        g.MapGet("/", async (IInventoryTransactionService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, IInventoryTransactionService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateInventoryTransactionRequest req, IInventoryTransactionService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/inventory-transactions/{dto.Id}", dto);
        });

        return api;
    }
}
