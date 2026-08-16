using System.Globalization;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public sealed class WooCommerceService(
    AppDbContext db,
    IInvoiceService invoices,
    WooCommerceRestClient client,
    IOptions<WooCommerceOptions> options) : IWooCommerceService
{
    private readonly WooCommerceOptions _options = options.Value;

    public async Task<IReadOnlyList<WooCommerceOrderDto>> ListOrdersAsync(int page, int pageSize, string? status, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var query = db.WooCommerceOrders.AsNoTracking().Include(x => x.Items).ThenInclude(x => x.Product).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status.Trim().ToLowerInvariant());
        var orders = await query.OrderByDescending(x => x.SourceCreatedAt).ThenByDescending(x => x.WooCommerceOrderId)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return orders.Select(ToDto).ToList();
    }

    public async Task<WooCommerceOrderDto?> GetOrderAsync(long wooCommerceOrderId, CancellationToken ct = default)
    {
        var order = await db.WooCommerceOrders.AsNoTracking().Include(x => x.Items).ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.WooCommerceOrderId == wooCommerceOrderId, ct);
        return order is null ? null : ToDto(order);
    }

    public async Task<WooCommerceSyncResult> SyncOrdersAsync(CancellationToken ct = default)
    {
        var remoteOrders = await client.GetOrdersAsync(ct);
        foreach (var remote in remoteOrders) await UpsertOrderAsync(remote, ct);
        return new WooCommerceSyncResult(remoteOrders.Count, 0, DateTimeOffset.UtcNow);
    }

    public async Task<WooCommerceProductLinkDto> LinkProductAsync(long wooCommerceProductId, LinkWooCommerceProductRequest request, CancellationToken ct = default)
    {
        if (wooCommerceProductId <= 0 || request.ProductId <= 0)
            throw new DomainValidationException("Mã sản phẩm WooCommerce và mã sản phẩm kho phải lớn hơn 0.");
        if (!await db.Products.AnyAsync(x => x.Id == request.ProductId, ct))
            throw new DomainValidationException("Sản phẩm kho không tồn tại.");

        var link = await db.WooCommerceProductLinks.FindAsync([request.ProductId], ct);
        var remoteConflict = await db.WooCommerceProductLinks.AnyAsync(x =>
            x.ProductId != request.ProductId && x.WooCommerceProductId == wooCommerceProductId &&
            x.WooCommerceVariationId == request.WooCommerceVariationId, ct);
        if (remoteConflict) throw new DomainValidationException("Sản phẩm WooCommerce này đã được liên kết với sản phẩm kho khác.");

        if (link is null)
        {
            link = new WooCommerceProductLink { ProductId = request.ProductId };
            db.WooCommerceProductLinks.Add(link);
        }
        link.WooCommerceProductId = wooCommerceProductId;
        link.WooCommerceVariationId = request.WooCommerceVariationId;
        link.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return new WooCommerceProductLinkDto(link.ProductId, link.WooCommerceProductId, link.WooCommerceVariationId);
    }

    public async Task<WooCommerceOrderDto?> ConfirmAsync(long wooCommerceOrderId, ConfirmWooCommerceOrderRequest request, CancellationToken ct = default)
    {
        if (request.CustomerId <= 0) throw new DomainValidationException("Cần chọn khách hàng kho để tạo hóa đơn.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({"warehouse.woocommerce.confirm:" + wooCommerceOrderId}))", ct);

        var order = await db.WooCommerceOrders.Include(x => x.Items).ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.WooCommerceOrderId == wooCommerceOrderId, ct);
        if (order is null) return null;
        if (order.ConfirmedInvoiceId is not null) throw new DomainValidationException("Đơn WooCommerce này đã được xác nhận thành hóa đơn.");
        var availability = EvaluateAvailability(order);
        if (availability.Code != "ready") throw new DomainValidationException(availability.Label);

        var invoice = await invoices.CreateAsync(new CreateInvoiceRequest(request.CustomerId,
            order.Items.Select(x => new CreateInvoiceLineRequest(x.ProductId!.Value, x.Quantity, null,
                $"WooCommerce #{order.OrderNumber}")).ToList()), ct);
        order.ConfirmedInvoiceId = invoice.Id;
        order.ConfirmedAt = DateTimeOffset.UtcNow;
        order.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(order);
    }

    public async Task<bool> AcceptWebhookAsync(string? signature, ReadOnlyMemory<byte> payload, CancellationToken ct = default)
    {
        if (!WooCommerceWebhookSignature.IsValid(_options.WebhookSecret, signature, payload.Span)) return false;
        await UpsertOrderAsync(client.ParseOrder(payload.Span), ct);
        return true;
    }

    private async Task UpsertOrderAsync(WooCommerceRemoteOrder remote, CancellationToken ct)
    {
        if (remote.Id <= 0) throw new DomainValidationException("Đơn WooCommerce không có mã hợp lệ.");
        var order = await db.WooCommerceOrders.Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.WooCommerceOrderId == remote.Id, ct);
        if (order?.ConfirmedInvoiceId is not null) return; // Warehouse invoice is immutable from external changes.
        if (order is null)
        {
            order = new WooCommerceOrder { WooCommerceOrderId = remote.Id };
            db.WooCommerceOrders.Add(order);
        }

        order.OrderNumber = string.IsNullOrWhiteSpace(remote.Number) ? remote.Id.ToString(CultureInfo.InvariantCulture) : remote.Number;
        order.Status = (remote.Status ?? string.Empty).Trim().ToLowerInvariant();
        order.Currency = remote.Currency;
        order.Total = ParseDecimal(remote.Total);
        order.CustomerName = FullName(remote.Billing);
        order.CustomerEmail = remote.Billing?.Email;
        order.CustomerPhone = remote.Billing?.Phone;
        order.ShippingAddress = FormatAddress(remote.Shipping ?? remote.Billing);
        order.SourceCreatedAt = remote.DateCreatedGmt;
        order.SourceUpdatedAt = remote.DateModifiedGmt;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        db.WooCommerceOrderItems.RemoveRange(order.Items);
        order.Items.Clear();
        var links = await db.WooCommerceProductLinks.AsNoTracking().ToListAsync(ct);
        foreach (var item in remote.LineItems ?? [])
        {
            if (item.Id <= 0 || item.Quantity <= 0) continue;
            var link = links.FirstOrDefault(x => x.WooCommerceProductId == item.ProductId && x.WooCommerceVariationId == item.VariationId)
                ?? links.FirstOrDefault(x => x.WooCommerceProductId == item.ProductId && x.WooCommerceVariationId is null);
            order.Items.Add(new WooCommerceOrderItem
            {
                WooCommerceOrderItemId = item.Id,
                WooCommerceProductId = item.ProductId,
                WooCommerceVariationId = item.VariationId,
                ProductId = link?.ProductId,
                ProductName = (item.Name ?? "Sản phẩm WooCommerce").Trim(),
                Quantity = item.Quantity,
                UnitPrice = ParseDecimal(item.Price),
                Subtotal = ParseDecimal(item.Subtotal),
            });
        }
        await db.SaveChangesAsync(ct);
    }

    private static WooCommerceOrderDto ToDto(WooCommerceOrder order)
    {
        var availability = EvaluateAvailability(order);
        return new WooCommerceOrderDto(order.WooCommerceOrderId, order.OrderNumber, order.Status, order.Currency, order.Total,
            order.CustomerName, order.CustomerEmail, order.CustomerPhone, order.ShippingAddress, order.SourceCreatedAt,
            order.SourceUpdatedAt, order.ConfirmedInvoiceId, order.ConfirmedAt, availability.Code, availability.Label,
            order.Items.Select(item => new WooCommerceOrderLineDto(item.WooCommerceOrderItemId, item.WooCommerceProductId,
                item.WooCommerceVariationId, item.ProductId, item.ProductName, item.Quantity, item.UnitPrice, item.Subtotal,
                item.Product?.InStock, item.ProductId is null ? "unmapped" : item.Product!.InStock >= item.Quantity ? "available" : "insufficient"))
                .ToList());
    }

    private static (string Code, string Label) EvaluateAvailability(WooCommerceOrder order)
    {
        if (order.Status is not ("processing" or "completed")) return ("not_eligible", "Chỉ đơn processing hoặc completed mới được xuất kho.");
        if (order.Items.Count == 0 || order.Items.Any(x => x.ProductId is null)) return ("unmapped", "Có sản phẩm chưa được liên kết với kho.");
        if (order.Items.Any(x => x.Product!.InStock < x.Quantity)) return ("insufficient_stock", "Tồn kho không đủ để xử lý đơn hàng.");
        return ("ready", "Đủ tồn kho, có thể xác nhận xuất kho.");
    }

    private static decimal ParseDecimal(string? value) => decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var result) ? result : 0m;
    private static string? FullName(WooCommerceRemoteAddress? address) => string.Join(' ', new[] { address?.FirstName, address?.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim() is { Length: > 0 } name ? name : null;
    private static string? FormatAddress(WooCommerceRemoteAddress? address) => address is null ? null : string.Join(", ", new[] { address.Address1, address.Address2, address.City, address.State, address.Postcode, address.Country }.Where(x => !string.IsNullOrWhiteSpace(x)));
}

public static class WooCommerceWebhookSignature
{
    public static bool IsValid(string? secret, string? signature, ReadOnlySpan<byte> payload)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signature)) return false;
        var expected = HMACSHA256.HashData(System.Text.Encoding.UTF8.GetBytes(secret), payload);
        try { return CryptographicOperations.FixedTimeEquals(expected, Convert.FromBase64String(signature)); }
        catch (FormatException) { return false; }
    }
}
