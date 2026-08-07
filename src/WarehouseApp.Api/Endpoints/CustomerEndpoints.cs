using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class CustomerEndpoints
{
    public static RouteGroupBuilder MapCustomerEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/customers").WithTags("Customers");

        g.MapGet("/", async (ICustomerService svc, int? page, int? pageSize, string? search, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, search, ct)));

        g.MapGet("/{id:long}", async (long id, ICustomerService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.Problem(detail: "Không tìm thấy khách hàng.", statusCode: 404));

        g.MapPost("/", async (CreateCustomerRequest req, ICustomerService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/customers/{dto.Id}", dto);
        });

        g.MapPut("/{id:long}", async (long id, UpdateCustomerRequest req, ICustomerService svc, CancellationToken ct) =>
            await svc.UpdateAsync(id, req, ct) is { } dto ? Results.Ok(dto) : Results.Problem(detail: "Không tìm thấy khách hàng.", statusCode: 404));

        return api;
    }
}
