using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class SubBackboardEndpoints
{
    public static RouteGroupBuilder MapSubBackboardEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/sub-backboards").WithTags("SubBackboards");

        g.MapGet("/", async (ISubBackboardService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, ISubBackboardService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateSubBackboardRequest req, ISubBackboardService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/sub-backboards/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateSubBackboardRequest req, ISubBackboardService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
