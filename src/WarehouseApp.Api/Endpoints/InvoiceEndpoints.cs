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

        g.MapGet("/{id}", async (string id, IInvoiceService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.Problem(detail: "Không tìm thấy hóa đơn.", statusCode: 404));

        g.MapPost("/", async (CreateInvoiceRequest req, IInvoiceService svc, CancellationToken ct) =>
        {
            var dto = await svc.CreateAsync(req, ct);
            return Results.Created($"/api/invoices/{dto.Id}", dto);
        });

        g.MapPut("/{id}/lines", async (string id, UpdateInvoiceLinesRequest req, IInvoiceService svc, CancellationToken ct) =>
            await svc.UpdateLinesAsync(id, req, ct) is { } dto
                ? Results.Ok(dto)
                : Results.Problem(detail: "Không tìm thấy hóa đơn.", statusCode: 404));

        return api;
    }

    public static RouteGroupBuilder MapPublicInvoiceEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/public/invoices").WithTags("Public invoice lookup");
        g.MapGet("/{token}", async (string token, IInvoiceService svc, CancellationToken ct) =>
            await svc.GetPublicAsync(token, ct) is { } dto
                ? Results.Ok(dto)
                : Results.Problem(detail: "Không tìm thấy hóa đơn hoặc liên kết tra cứu đã hết hiệu lực.", statusCode: 404))
            .RequireRateLimiting("PublicInvoiceLookup");
        g.MapPost("/lookup", async (PublicInvoiceLookupRequest request, IInvoiceService svc, CancellationToken ct) =>
            await svc.LookupPublicAsync(request, ct) is { } dto
                ? Results.Ok(dto)
                : Results.Problem(detail: "Mã tra cứu hoặc 4 số cuối điện thoại không chính xác.", statusCode: 404))
            .RequireRateLimiting("PublicInvoiceLookup");
        return api;
    }
}
