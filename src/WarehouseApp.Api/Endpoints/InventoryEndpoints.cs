using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Api.Services;

namespace WarehouseApp.Api.Endpoints;

public static class InventoryEndpoints
{
    public static RouteGroupBuilder MapInventoryEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/inventory").WithTags("Inventory");

        g.MapGet("/", async (IInventoryService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, IInventoryService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.Problem(detail: "Không tìm thấy sản phẩm.", statusCode: 404));

        g.MapPost("/", async (CreateProductRequest req, IInventoryService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/inventory/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateProductRequest req, IInventoryService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.Problem(detail: "Không tìm thấy sản phẩm.", statusCode: 404));

        g.MapPost("/{id:long}/image", async (
            long id,
            IFormFile file,
            IInventoryService svc,
            ProductImageStorage storage,
            CancellationToken ct) =>
        {
            var current = await svc.GetAsync(id, ct);
            if (current is null)
                return Results.Problem(detail: "Không tìm thấy sản phẩm.", statusCode: StatusCodes.Status404NotFound);

            var imageUrl = await storage.SaveAsWebpAsync(file, ct);
            try
            {
                var updated = await svc.SetImageUrlAsync(id, imageUrl, ct);
                if (updated is null)
                {
                    await storage.DeleteAsync(imageUrl);
                    return Results.Problem(detail: "Không tìm thấy sản phẩm.", statusCode: StatusCodes.Status404NotFound);
                }

                await storage.DeleteAsync(current.ImageUrl);
                return Results.Ok(updated);
            }
            catch
            {
                await storage.DeleteAsync(imageUrl);
                throw;
            }
        })
        .Accepts<IFormFile>("multipart/form-data")
        .Produces<ProductDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound);

        g.MapDelete("/{id:long}/image", async (
            long id,
            IInventoryService svc,
            ProductImageStorage storage,
            CancellationToken ct) =>
        {
            var current = await svc.GetAsync(id, ct);
            if (current is null)
                return Results.Problem(detail: "Không tìm thấy sản phẩm.", statusCode: StatusCodes.Status404NotFound);

            var updated = await svc.SetImageUrlAsync(id, null, ct);
            await storage.DeleteAsync(current.ImageUrl);
            return Results.Ok(updated);
        })
        .Produces<ProductDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPost("/{id:long}/adjust", async (long id, StockAdjustmentRequest req, IInventoryService svc, CancellationToken ct) =>
            await svc.AdjustStockAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.Problem(detail: "Không tìm thấy sản phẩm.", statusCode: 404));

        return api;
    }
}
