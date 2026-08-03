using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IInventoryService
{
    Task<PagedResult<ProductDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
    Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken ct = default);
    Task<ProductDto?> AdjustStockAsync(Guid id, StockAdjustmentRequest request, CancellationToken ct = default);
}
