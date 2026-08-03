using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class InventoryEndpoints
{
    public static RouteGroupBuilder MapInventoryEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/inventory").WithTags("Inventory");

        g.MapGet("/", async (IInventoryService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:guid}", async (Guid id, IInventoryService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateProductRequest req, IInventoryService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/inventory/{dto.Id}", dto);
        });

        g.MapPut("/{id:guid}", async (Guid id, UpdateProductRequest req, IInventoryService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/{id:guid}/adjust", async (Guid id, StockAdjustmentRequest req, IInventoryService svc, CancellationToken ct) =>
            await svc.AdjustStockAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
