using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class PricingEndpoints
{
    public static RouteGroupBuilder MapPricingEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/pricing").WithTags("Pricing");

        g.MapGet("/rate-card", async (IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetRateCardAsync(ct)));

        g.MapPut("/rate-card", async (UpdateRateCardRequest req, IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.UpdateRateCardAsync(req, ct)));

        g.MapGet("/components/{productId:long}", async (long productId, IPricingService svc, CancellationToken ct) =>
            await svc.GetComponentsAsync(productId, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPut("/components/{productId:long}", async (long productId, UpsertProductComponentRequest req, IPricingService svc, CancellationToken ct) =>
            await svc.UpsertComponentsAsync(productId, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
