using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class SettingsEndpoints
{
    public static RouteGroupBuilder MapSettingsEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/settings").WithTags("Settings");

        g.MapGet("/smtp", async (ISettingsService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetSmtpAsync(ct)));

        g.MapPut("/smtp", async (UpdateSmtpConfigRequest req, ISettingsService svc, CancellationToken ct) =>
            Results.Ok(await svc.UpdateSmtpAsync(req, ct)));

        return api;
    }
}
