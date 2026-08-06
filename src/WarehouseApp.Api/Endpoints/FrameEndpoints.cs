using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class FrameEndpoints
{
    public static RouteGroupBuilder MapFrameEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/frames").WithTags("Frames");

        g.MapGet("/", async (IFrameService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, IFrameService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateFrameRequest req, IFrameService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/frames/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateFrameRequest req, IFrameService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
