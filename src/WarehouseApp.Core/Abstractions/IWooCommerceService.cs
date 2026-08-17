using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IWooCommerceService
{
    Task<IReadOnlyList<WooCommerceOrderDto>> ListOrdersAsync(int page, int pageSize, string? status, CancellationToken ct = default);
    Task<WooCommerceOrderDto?> GetOrderAsync(long wooCommerceOrderId, CancellationToken ct = default);
    Task<WooCommerceSyncResult> SyncOrdersAsync(CancellationToken ct = default);
    Task<WooCommerceCatalogSyncResult> SyncCatalogAsync(CancellationToken ct = default);
    Task<WooCommerceProductLinkDto?> GetProductLinkAsync(long productId, CancellationToken ct = default);
    /// <summary>Pushes the current warehouse state when this product is already linked.
    /// Returns false when no link exists.</summary>
    Task<bool> SyncLinkedProductAsync(long productId, bool synchronizeImage = false, CancellationToken ct = default);
    Task<WooCommerceProductLinkDto> PublishAndLinkProductAsync(LinkWarehouseProductRequest request, CancellationToken ct = default);
    Task<bool> UnlinkProductAsync(long productId, CancellationToken ct = default);
    Task<WooCommerceProductLinkDto> LinkProductAsync(long wooCommerceProductId, LinkWooCommerceProductRequest request, CancellationToken ct = default);
    Task<WooCommerceOrderDto?> ConfirmAsync(long wooCommerceOrderId, ConfirmWooCommerceOrderRequest request, CancellationToken ct = default);
    Task<bool> AcceptWebhookAsync(string? signature, ReadOnlyMemory<byte> payload, CancellationToken ct = default);
}
