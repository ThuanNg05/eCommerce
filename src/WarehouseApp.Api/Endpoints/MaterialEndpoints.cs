using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class MaterialEndpoints
{
    public static RouteGroupBuilder MapMaterialEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/materials").WithTags("Materials");

        g.MapGet("/", async (IMaterialService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, IMaterialService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateMaterialRequest req, IMaterialService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/materials/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateMaterialRequest req, IMaterialService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
