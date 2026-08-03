using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class InvoiceEndpoints
{
    public static RouteGroupBuilder MapInvoiceEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/invoices").WithTags("Invoicing");

        g.MapGet("/", async (IInvoiceService svc, int? page, int? pageSize, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(page ?? 1, pageSize ?? 50, ct)));

        g.MapGet("/{id:guid}", async (Guid id, IInvoiceService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        g.MapPost("/", async (CreateInvoiceRequest req, IInvoiceService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/invoices/{dto.Id}", dto);
        });

        g.MapPost("/{id:guid}/issue", async (Guid id, IInvoiceService svc, CancellationToken ct) =>
            await svc.IssueAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound());

        return api;
    }
}
