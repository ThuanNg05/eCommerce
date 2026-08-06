using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class BackboardEndpoints
{
    public static RouteGroupBuilder MapBackboardEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/backboards").WithTags("Backboards");

        g.MapGet("/", async (IBackboardService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, IBackboardService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateBackboardRequest req, IBackboardService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/backboards/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateBackboardRequest req, IBackboardService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
