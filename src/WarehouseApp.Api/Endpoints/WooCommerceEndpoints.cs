using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class WooCommerceEndpoints
{
    public static RouteGroupBuilder MapWooCommerceEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/woocommerce").WithTags("WooCommerce");

        g.MapGet("/orders", async (IWooCommerceService service, int? page, int? pageSize, string? status, CancellationToken ct) =>
            Results.Ok(await service.ListOrdersAsync(page ?? 1, pageSize ?? 50, status, ct)));

        g.MapGet("/orders/{wooCommerceOrderId:long}", async (long wooCommerceOrderId, IWooCommerceService service, CancellationToken ct) =>
            await service.GetOrderAsync(wooCommerceOrderId, ct) is { } order
                ? Results.Ok(order)
                : Results.Problem(detail: "Không tìm thấy đơn WooCommerce.", statusCode: StatusCodes.Status404NotFound));

        g.MapGet("/orders/status-reasons", async (string? status, IWooCommerceService service, CancellationToken ct) =>
            Results.Ok(await service.ListOrderStatusReasonsAsync(status, ct)));

        g.MapPost("/orders/sync", async (IWooCommerceService service, CancellationToken ct) =>
            Results.Ok(await service.SyncOrdersAsync(ct))).RequireAuthorization("AdminOnly");

        g.MapPost("/products/sync", async (IWooCommerceService service, CancellationToken ct) =>
            Results.Ok(await service.SyncCatalogAsync(ct))).RequireAuthorization("AdminOnly");

        g.MapPost("/products/publish-link", async (
            LinkWarehouseProductRequest request, IWooCommerceService service, CancellationToken ct) =>
            Results.Ok(await service.PublishAndLinkProductAsync(request, ct)));

        g.MapGet("/products/{productId:long}/link", async (
            long productId, IWooCommerceService service, CancellationToken ct) =>
            await service.GetProductLinkAsync(productId, ct) is { } link
                ? Results.Ok(link)
                : Results.Problem(detail: "Sản phẩm chưa được liên kết với WooCommerce.", statusCode: StatusCodes.Status404NotFound));

        g.MapDelete("/products/{productId:long}/link", async (
            long productId, IWooCommerceService service, CancellationToken ct) =>
            await service.UnlinkProductAsync(productId, ct)
                ? Results.NoContent()
                : Results.Problem(detail: "Sản phẩm chưa được liên kết với WooCommerce.", statusCode: StatusCodes.Status404NotFound));

        g.MapPost("/orders/{wooCommerceOrderId:long}/confirm", async (
            long wooCommerceOrderId, ConfirmWooCommerceOrderRequest request, IWooCommerceService service, CancellationToken ct) =>
            await service.ConfirmAsync(wooCommerceOrderId, request, ct) is { } order
                ? Results.Ok(order)
                : Results.Problem(detail: "Không tìm thấy đơn WooCommerce.", statusCode: StatusCodes.Status404NotFound));

        g.MapPut("/orders/{wooCommerceOrderId:long}/status", async (
            long wooCommerceOrderId, UpdateWooCommerceOrderStatusRequest request, IWooCommerceService service, CancellationToken ct) =>
            await service.UpdateOrderStatusAsync(wooCommerceOrderId, request, ct) is { } order
                ? Results.Ok(order)
                : Results.Problem(detail: "Không tìm thấy đơn WooCommerce.", statusCode: StatusCodes.Status404NotFound));

        g.MapPut("/products/{wooCommerceProductId:long}/link", async (
            long wooCommerceProductId, LinkWooCommerceProductRequest request, IWooCommerceService service, CancellationToken ct) =>
            Results.Ok(await service.LinkProductAsync(wooCommerceProductId, request, ct))).RequireAuthorization("AdminOnly");

        return api;
    }

    public static RouteGroupBuilder MapWooCommerceWebhookEndpoint(this RouteGroupBuilder api)
    {
        api.MapPost("/webhooks/woocommerce", async (HttpRequest request, IWooCommerceService service, CancellationToken ct) =>
        {
            await using var body = new MemoryStream();
            await request.Body.CopyToAsync(body, ct);
            var accepted = await service.AcceptWebhookAsync(request.Headers["X-WC-Webhook-Signature"], body.ToArray(), ct);
            return accepted ? Results.Ok() : Results.Problem(detail: "Chữ ký webhook WooCommerce không hợp lệ.", statusCode: StatusCodes.Status401Unauthorized);
        }).DisableAntiforgery().WithTags("WooCommerce");
        return api;
    }
}
