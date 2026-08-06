using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/accounts").WithTags("Accounts");

        g.MapGet("/", async (IAccountService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, IAccountService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateAccountRequest req, IAccountService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/accounts/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateAccountRequest req, IAccountService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
