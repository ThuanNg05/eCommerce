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
    private static readonly HashSet<string> AllowedOrderStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed", "draft"
    };

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

    public async Task<WooCommerceCatalogSyncResult> SyncCatalogAsync(CancellationToken ct = default)
    {
        var productIds = await db.WooCommerceProductLinks.AsNoTracking()
            .Select(x => x.ProductId).ToListAsync(ct);
        foreach (var productId in productIds)
            await SyncLinkedProductAsync(productId, synchronizeImage: true, ct: ct);
        return new WooCommerceCatalogSyncResult(productIds.Count, DateTimeOffset.UtcNow);
    }

    public async Task<WooCommerceCategorySyncResult> SyncCategoriesAsync(CancellationToken ct = default)
    {
        var remoteCategories = await client.GetCategoriesAsync(ct);
        foreach (var remote in remoteCategories)
            await UpsertCategoryAsync(remote, ct);

        return new WooCommerceCategorySyncResult(remoteCategories.Count, DateTimeOffset.UtcNow);
    }

    public async Task<WooCommerceProductLinkDto?> GetProductLinkAsync(long productId, CancellationToken ct = default)
    {
        var link = await db.WooCommerceProductLinks.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProductId == productId, ct);
        return link is null ? null : new WooCommerceProductLinkDto(link.ProductId, link.WooCommerceProductId, link.WooCommerceVariationId);
    }

    public async Task<WooCommerceCategoryLinkDto?> GetCategoryLinkAsync(long categoryId, CancellationToken ct = default)
    {
        var link = await db.WooCommerceCategoryLinks.AsNoTracking().SingleOrDefaultAsync(x => x.CategoryId == categoryId, ct);
        return link is null ? null : new WooCommerceCategoryLinkDto(link.CategoryId, link.WooCommerceCategoryId);
    }

    public async Task<WooCommerceCategoryLinkDto> PublishAndLinkCategoryAsync(
        LinkWarehouseCategoryRequest request, CancellationToken ct = default)
    {
        if (request.CategoryId <= 0)
            throw new DomainValidationException("Mã danh mục kho phải lớn hơn 0.");

        var category = await db.Categories.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.CategoryId, ct)
            ?? throw new DomainValidationException("Danh mục kho không tồn tại.");
        if (!category.IsActive)
            throw new DomainValidationException("Không thể liên kết danh mục đang tạm ngưng lên WooCommerce.");

        var existing = await db.WooCommerceCategoryLinks.SingleOrDefaultAsync(x => x.CategoryId == category.Id, ct);
        if (existing is not null)
        {
            await client.UpdateCategoryAsync(existing.WooCommerceCategoryId, category.Name, ct);
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return new WooCommerceCategoryLinkDto(existing.CategoryId, existing.WooCommerceCategoryId);
        }

        var remoteId = await client.FindOrCreateCategoryAsync(category.Name, ct);
        var remoteConflict = await db.WooCommerceCategoryLinks.AnyAsync(x => x.WooCommerceCategoryId == remoteId, ct);
        if (remoteConflict)
            throw new DomainValidationException("Danh mục WooCommerce này đã được liên kết với danh mục kho khác.");

        var link = new WooCommerceCategoryLink
        {
            CategoryId = category.Id,
            WooCommerceCategoryId = remoteId,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.WooCommerceCategoryLinks.Add(link);
        await db.SaveChangesAsync(ct);
        return new WooCommerceCategoryLinkDto(link.CategoryId, link.WooCommerceCategoryId);
    }

    public async Task<bool> SyncLinkedCategoryAsync(long categoryId, CancellationToken ct = default)
    {
        var link = await db.WooCommerceCategoryLinks.Include(x => x.Category)
            .SingleOrDefaultAsync(x => x.CategoryId == categoryId, ct);
        if (link?.Category is not { IsActive: true } category) return false;

        await client.UpdateCategoryAsync(link.WooCommerceCategoryId, category.Name, ct);
        link.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SyncLinkedProductAsync(long productId, bool synchronizeImage = false, CancellationToken ct = default)
    {
        var link = await db.WooCommerceProductLinks.AsNoTracking().Include(x => x.Product)
            .SingleOrDefaultAsync(x => x.ProductId == productId, ct);
        if (link?.Product is not { } product) return false;

        var categoryIds = await ResolveWooCommerceCategoriesAsync(product.Id, ct);
        var size = product.SubBackboardId is long subBackboardId
            ? await db.SubBackboards.AsNoTracking().Where(x => x.Id == subBackboardId).Select(x => x.Size).SingleOrDefaultAsync(ct)
            : null;
        var description = WithSize(product.Description, size);
        var price = product.PriceRetail ?? product.BasePrice;
        IReadOnlyList<WooCommerceImageUpdate>? images = null;
        if (synchronizeImage)
            images = string.IsNullOrWhiteSpace(product.ImageUrl)
                ? []
                : [new WooCommerceImageUpdate(product.ImageUrl)];

        await client.UpdateProductAsync(link.WooCommerceProductId, link.WooCommerceVariationId,
            new WooCommerceCatalogUpdate(
                product.Name,
                product.Sku,
                description,
                price.ToString("0.###", CultureInfo.InvariantCulture),
                true,
                product.InStock,
                product.Status == 1 && product.InStock > 0 ? "instock" : "outofstock",
                product.WarningStock,
                images,
                categoryIds,
                BuildDimensions(product.Width, product.Height, size),
                product.Status == 1 ? "publish" : "draft"), ct);
        return true;
    }

    public async Task<WooCommerceProductLinkDto> PublishAndLinkProductAsync(
        LinkWarehouseProductRequest request, CancellationToken ct = default)
    {
        if (request.ProductId <= 0)
            throw new DomainValidationException("Mã sản phẩm kho phải lớn hơn 0.");

        var product = await db.Products.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.ProductId, ct)
            ?? throw new DomainValidationException("Sản phẩm kho không tồn tại.");

        if (product.Status != 1)
            throw new DomainValidationException("Chỉ sản phẩm ở trạng thái Hoạt động mới được liên kết lên website.");
        if (string.IsNullOrWhiteSpace(product.ImageUrl))
            throw new DomainValidationException("Sản phẩm phải có ảnh trước khi liên kết lên website.");
        if (IsWebpImage(product.ImageUrl))
            throw new DomainValidationException("Ảnh hiện tại là WebP và website không cho phép định dạng này. Vui lòng upload lại ảnh trước khi liên kết.");

        var existingLink = await db.WooCommerceProductLinks.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProductId == product.Id, ct);
        if (existingLink is not null)
            throw new DomainValidationException("Sản phẩm đã được liên kết. Hãy dùng chức năng đồng bộ để cập nhật thông tin.");

        var categoryIds = await ResolveWooCommerceCategoriesAsync(product.Id, ct);
        var size = product.SubBackboardId is long subBackboardId
            ? await db.SubBackboards.AsNoTracking().Where(x => x.Id == subBackboardId).Select(x => x.Size).SingleOrDefaultAsync(ct)
            : null;

        var description = WithSize(product.Description, size);

        var price = product.PriceRetail ?? product.BasePrice;
        var wooCommerceProductId = await client.CreateProductAsync(new WooCommerceCatalogCreate(
            product.Name,
            product.Sku,
            description,
            price.ToString("0.###", CultureInfo.InvariantCulture),
            true,
            product.InStock,
            product.InStock > 0 ? "instock" : "outofstock",
            product.WarningStock,
            [new WooCommerceImageUpdate(product.ImageUrl)],
            categoryIds,
            BuildDimensions(product.Width, product.Height, size)), ct);

        var link = new WooCommerceProductLink
        {
            ProductId = product.Id,
            WooCommerceProductId = wooCommerceProductId,
            WooCommerceVariationId = null,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.WooCommerceProductLinks.Add(link);
        await db.SaveChangesAsync(ct);
        return new WooCommerceProductLinkDto(link.ProductId, link.WooCommerceProductId, link.WooCommerceVariationId);
    }

    public async Task<bool> UnlinkProductAsync(long productId, CancellationToken ct = default)
    {
        if (productId <= 0)
            throw new DomainValidationException("Mã sản phẩm kho phải lớn hơn 0.");

        var link = await db.WooCommerceProductLinks.FindAsync([productId], ct);
        if (link is null) return false;

        // Keep the link if WooCommerce rejects the status change, so staff can retry
        // without accidentally leaving a published product unmanaged.
        await client.SetProductStatusAsync(link.WooCommerceProductId, link.WooCommerceVariationId, "draft", ct);
        db.WooCommerceProductLinks.Remove(link);
        await db.SaveChangesAsync(ct);
        return true;
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
        await SyncLinkedProductAsync(request.ProductId, synchronizeImage: true, ct: ct);
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

    public async Task<WooCommerceOrderDto?> UpdateOrderStatusAsync(
        long wooCommerceOrderId, UpdateWooCommerceOrderStatusRequest request, CancellationToken ct = default)
    {
        if (wooCommerceOrderId <= 0) throw new DomainValidationException("Mã đơn WooCommerce phải lớn hơn 0.");
        var status = request.Status?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(status) || !AllowedOrderStatuses.Contains(status))
            throw new DomainValidationException("Trạng thái WooCommerce không hợp lệ.");

        var reasonCode = request.ReasonCode?.Trim().ToLowerInvariant();
        var requiresReason = status is "cancelled" or "refunded";
        WooCommerceOrderStatusReason? reason = null;
        if (requiresReason)
        {
            if (string.IsNullOrWhiteSpace(reasonCode))
                throw new DomainValidationException("Vui lòng chọn lý do cho trạng thái hủy hoặc hoàn tiền.");
            reason = await db.WooCommerceOrderStatusReasons.FirstOrDefaultAsync(
                x => x.Code == reasonCode && x.TargetStatus == status && x.IsActive, ct);
            if (reason is null)
                throw new DomainValidationException("Lý do trạng thái WooCommerce không hợp lệ.");
        }
        else if (!string.IsNullOrWhiteSpace(reasonCode))
        {
            throw new DomainValidationException("Chỉ được chọn lý do khi chuyển đơn sang hủy hoặc hoàn tiền.");
        }
        if (request.Note?.Length > 1000)
            throw new DomainValidationException("Ghi chú lý do không được vượt quá 1000 ký tự.");

        var order = await db.WooCommerceOrders.Include(x => x.Items).ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.WooCommerceOrderId == wooCommerceOrderId, ct);
        if (order is null) return null;

        // Update WooCommerce first. The local snapshot changes only after the remote API accepts it.
        var previousStatus = order.Status;
        await client.SetOrderStatusAsync(wooCommerceOrderId, status, ct);
        order.Status = status;
        order.SourceUpdatedAt = DateTimeOffset.UtcNow;
        order.UpdatedAt = DateTimeOffset.UtcNow;
        if (!string.Equals(previousStatus, status, StringComparison.OrdinalIgnoreCase))
        {
            db.WooCommerceOrderStatusHistories.Add(new WooCommerceOrderStatusHistory
            {
                WooCommerceOrderId = order.WooCommerceOrderId,
                FromStatus = previousStatus,
                ToStatus = status,
                ReasonCode = reason?.Code,
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                Source = "warehouse",
            });
        }
        await db.SaveChangesAsync(ct);
        return ToDto(order);
    }

    public async Task<IReadOnlyList<WooCommerceOrderStatusReasonDto>> ListOrderStatusReasonsAsync(
        string? targetStatus, CancellationToken ct = default)
    {
        var status = targetStatus?.Trim().ToLowerInvariant();
        var query = db.WooCommerceOrderStatusReasons.AsNoTracking().Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.TargetStatus == status);
        return await query.OrderBy(x => x.TargetStatus).ThenBy(x => x.SortOrder).ThenBy(x => x.Label)
            .Select(x => new WooCommerceOrderStatusReasonDto(x.Code, x.TargetStatus, x.Label))
            .ToListAsync(ct);
    }

    public async Task<bool> AcceptWebhookAsync(
        string? signature,
        string? topic,
        string? eventName,
        ReadOnlyMemory<byte> payload,
        CancellationToken ct = default)
    {
        if (!WooCommerceWebhookSignature.IsValid(_options.WebhookSecret, signature, payload.Span)) return false;
        if (string.Equals(eventName?.Trim(), "ping", StringComparison.OrdinalIgnoreCase)) return true;

        var normalizedTopic = topic?.Trim().ToLowerInvariant();
        if (normalizedTopic is "product_cat.created" or "product_cat.updated")
            await UpsertCategoryAsync(client.ParseCategory(payload.Span), ct);
        else if (normalizedTopic is "action.woocommerce_warehouse_category_created" or "action.woocommerce_warehouse_category_updated")
        {
            var categoryId = client.ParseCategoryId(payload.Span);
            await UpsertCategoryAsync(await client.GetCategoryAsync(categoryId, ct), ct);
        }
        else if (string.IsNullOrWhiteSpace(normalizedTopic) || normalizedTopic.StartsWith("order.", StringComparison.Ordinal))
            await UpsertOrderAsync(client.ParseOrder(payload.Span), ct);
        return true;
    }

    private async Task UpsertCategoryAsync(WooCommerceRemoteCategory remote, CancellationToken ct)
    {
        if (remote.Id <= 0 || string.IsNullOrWhiteSpace(remote.Name))
            throw new DomainValidationException("Webhook WooCommerce không chứa danh mục hợp lệ.");

        var name = Limit(remote.Name, 255) ?? throw new DomainValidationException("Tên danh mục WooCommerce không hợp lệ.");
        var link = await db.WooCommerceCategoryLinks.Include(x => x.Category)
            .SingleOrDefaultAsync(x => x.WooCommerceCategoryId == remote.Id, ct);

        if (link is null)
        {
            var category = await db.Categories.SingleOrDefaultAsync(x => x.Name == name, ct);
            if (category is not null)
            {
                var existingCategoryLink = await db.WooCommerceCategoryLinks.SingleOrDefaultAsync(x => x.CategoryId == category.Id, ct);
                if (existingCategoryLink is not null && existingCategoryLink.WooCommerceCategoryId != remote.Id)
                    throw new DomainValidationException("Danh mục kho trùng tên đã liên kết với danh mục WooCommerce khác.");
                if (existingCategoryLink is not null) return;

                link = new WooCommerceCategoryLink { CategoryId = category.Id, WooCommerceCategoryId = remote.Id };
                db.WooCommerceCategoryLinks.Add(link);
            }
            else
            {
                category = new Category { Name = name };
                db.Categories.Add(category);
                link = new WooCommerceCategoryLink { Category = category, WooCommerceCategoryId = remote.Id };
                db.WooCommerceCategoryLinks.Add(link);
            }
        }
        else if (link.Category is { IsActive: false })
        {
            return;
        }
        else if (link.Category is not null && !string.Equals(link.Category.Name, name, StringComparison.Ordinal))
        {
            var nameConflict = await db.Categories.AnyAsync(x => x.Id != link.CategoryId && x.Name == name, ct);
            if (nameConflict)
                throw new DomainValidationException("Tên danh mục WooCommerce trùng với danh mục kho khác.");
            link.Category.Name = name;
            link.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
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
        order.CustomerName = FullName(remote.Shipping) ?? FullName(remote.Billing);
        order.CustomerPhone = NormalizePhone(remote.Billing?.Phone) ?? NormalizePhone(remote.Shipping?.Phone);
        order.CustomerEmail = Limit(remote.Billing?.Email?.Trim(), 255) ?? Limit(remote.Shipping?.Email?.Trim(), 255);
        order.ShippingAddress = Limit(FormatAddress(remote.Shipping ?? remote.Billing), 255);
        order.CustomerNote = remote.CustomerNote;
        await UpsertWooCommerceCustomerAsync(remote, ct);
        // PostgreSQL timestamp with time zone requires DateTimeOffset values normalized to UTC.
        order.SourceCreatedAt = (remote.DateCreated ?? remote.DateCreatedGmt)?.ToUniversalTime();
        order.SourceUpdatedAt = (remote.DateModified ?? remote.DateModifiedGmt)?.ToUniversalTime();
        order.UpdatedAt = DateTimeOffset.UtcNow;

        var links = await db.WooCommerceProductLinks.AsNoTracking().ToListAsync(ct);
        var remoteItemIds = new HashSet<long>();
        var existingItems = order.Items.ToDictionary(x => x.WooCommerceOrderItemId);
        foreach (var item in remote.LineItems ?? [])
        {
            if (item.Id <= 0 || item.Quantity <= 0 || !remoteItemIds.Add(item.Id)) continue;
            var link = links.FirstOrDefault(x => x.WooCommerceProductId == item.ProductId && x.WooCommerceVariationId == item.VariationId)
                ?? links.FirstOrDefault(x => x.WooCommerceProductId == item.ProductId && x.WooCommerceVariationId is null);

            if (!existingItems.TryGetValue(item.Id, out var orderItem))
            {
                orderItem = new WooCommerceOrderItem { WooCommerceOrderItemId = item.Id };
                order.Items.Add(orderItem);
            }

            orderItem.WooCommerceProductId = item.ProductId;
            orderItem.WooCommerceVariationId = item.VariationId;
            orderItem.ProductId = link?.ProductId;
            orderItem.ProductName = (item.Name ?? "Sản phẩm WooCommerce").Trim();
            orderItem.Quantity = item.Quantity;
            orderItem.UnitPrice = ParseDecimal(item.Price);
            orderItem.Subtotal = ParseDecimal(item.Subtotal);
        }

        foreach (var staleItem in order.Items.Where(x => !remoteItemIds.Contains(x.WooCommerceOrderItemId)).ToList())
        {
            db.WooCommerceOrderItems.Remove(staleItem);
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task UpsertWooCommerceCustomerAsync(WooCommerceRemoteOrder remote, CancellationToken ct)
    {
        var name = Limit(FullName(remote.Shipping) ?? FullName(remote.Billing) ?? $"Khách WooCommerce #{remote.Id}", 255)
            ?? "Khách WooCommerce";
        var phone = NormalizePhone(remote.Billing?.Phone) ?? NormalizePhone(remote.Shipping?.Phone);
        var email = Limit(remote.Billing?.Email?.Trim(), 255) ?? Limit(remote.Shipping?.Email?.Trim(), 255);
        var formattedAddress = Limit(FormatAddress(remote.Shipping ?? remote.Billing), 255);

        var customer = !string.IsNullOrWhiteSpace(phone)
            ? await db.Customers.FirstOrDefaultAsync(x => x.Phone == phone, ct)
            : null;
        customer ??= !string.IsNullOrWhiteSpace(email)
            ? await db.Customers.FirstOrDefaultAsync(x => x.Email == email, ct)
            : null;
        customer ??= await db.Customers.FirstOrDefaultAsync(x => x.Name == name, ct);

        if (customer is null)
        {
            customer = new Customer
            {
                Name = name,
                Phone = phone ?? PlaceholderPhone(remote.Id),
                Address = formattedAddress,
                Email = email,
                GroupPrice = "L",
                Description = "Khách hàng đồng bộ từ WooCommerce",
            };
            db.Customers.Add(customer);
            return;
        }

        // Nếu là khách hàng tự động đồng bộ từ WooCommerce, cập nhật lại tên đầy đủ khi re-sync.
        if (customer.Description == "Khách hàng đồng bộ từ WooCommerce" && !string.IsNullOrWhiteSpace(name))
        {
            customer.Name = name;
        }
        if (!string.IsNullOrWhiteSpace(formattedAddress)) customer.Address = formattedAddress;
        if (!string.IsNullOrWhiteSpace(email) && (string.IsNullOrWhiteSpace(customer.Email) || customer.Email == email)) customer.Email = email;
        if (!string.IsNullOrWhiteSpace(phone) && (string.IsNullOrWhiteSpace(customer.Phone) || customer.Phone == phone)) customer.Phone = phone;
        customer.UpdatedAt = DateTimeOffset.UtcNow;
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
                .ToList(), order.CustomerNote);
    }

    private static (string Code, string Label) EvaluateAvailability(WooCommerceOrder order)
    {
        if (order.Status is not ("processing" or "completed")) return ("not_eligible", "Chỉ đơn processing hoặc completed mới được xuất kho.");
        if (order.Items.Count == 0 || order.Items.Any(x => x.ProductId is null)) return ("unmapped", "Có sản phẩm chưa được liên kết với kho.");
        if (order.Items.Any(x => x.Product!.InStock < x.Quantity)) return ("insufficient_stock", "Tồn kho không đủ để xử lý đơn hàng.");
        return ("ready", "Đủ tồn kho, có thể xác nhận xuất kho.");
    }

    private static decimal ParseDecimal(string? value) => decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var result) ? result : 0m;

    private static WooCommerceDimensions? ParseDimensions(string? size)
    {
        if (string.IsNullOrWhiteSpace(size)) return null;
        var values = System.Text.RegularExpressions.Regex.Matches(size, @"\d+(?:[.,]\d+)?")
            .Select(x => x.Value.Replace(',', '.'))
            .ToList();
        if (values.Count < 2) return null;
        return new WooCommerceDimensions(values[0], values[1], values.Count > 2 ? values[2] : string.Empty);
    }

    private static WooCommerceDimensions? BuildDimensions(decimal? width, decimal? height, string? fallbackSize) =>
        width is not null && height is not null
            ? new WooCommerceDimensions(
                string.Empty,
                width.Value.ToString("0.##", CultureInfo.InvariantCulture),
                height.Value.ToString("0.##", CultureInfo.InvariantCulture))
            : ParseDimensions(fallbackSize);

    private async Task<List<WooCommerceProductCategory>> ResolveWooCommerceCategoriesAsync(long productId, CancellationToken ct)
    {
        var categoryIds = await db.ProductCategories.AsNoTracking()
            .Where(x => x.ProductId == productId)
            .Select(x => x.CategoryId)
            .ToListAsync(ct);

        var remoteCategories = new List<WooCommerceProductCategory>();
        foreach (var categoryId in categoryIds.Distinct())
        {
            var link = await GetCategoryLinkAsync(categoryId, ct)
                ?? await PublishAndLinkCategoryAsync(new LinkWarehouseCategoryRequest(categoryId), ct);
            remoteCategories.Add(new WooCommerceProductCategory(link.WooCommerceCategoryId));
        }
        return remoteCategories;
    }

    private static string WithSize(string? description, string? size)
    {
        var normalized = description?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(size) || normalized.Contains(size, StringComparison.OrdinalIgnoreCase)) return normalized;
        return string.IsNullOrWhiteSpace(normalized) ? $"Kích thước: {size}" : $"{normalized}\n\nKích thước: {size}";
    }

    private static bool IsWebpImage(string imageUrl) =>
        Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) &&
        uri.AbsolutePath.EndsWith(".webp", StringComparison.OrdinalIgnoreCase);

    private static string? FullName(WooCommerceRemoteAddress? address) => string.Join(' ', new[] { address?.FirstName, address?.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim() is { Length: > 0 } name ? name : null;
    private static string? FormatAddress(WooCommerceRemoteAddress? address) => address is null ? null : string.Join(", ", new[] { address.Address1, address.Address2, address.City, address.State, address.Postcode, address.Country }.Where(x => !string.IsNullOrWhiteSpace(x)));
    private static string? Limit(string? value, int maxLength) => string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, maxLength)];
    private static string? NormalizePhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("84") && digits.Length is >= 10 and <= 12) digits = "0" + digits[2..];
        return digits.Length is >= 9 and <= 11 ? digits : null;
    }
    private static string PlaceholderPhone(long orderId)
    {
        var digits = orderId.ToString(CultureInfo.InvariantCulture).PadLeft(9, '0');
        return $"WC{digits[^9..]}";
    }
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
