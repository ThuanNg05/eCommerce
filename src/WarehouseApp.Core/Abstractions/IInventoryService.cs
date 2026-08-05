using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IInventoryService
{
    Task<PagedResult<ProductDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<ProductDto?> GetAsync(long id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
    Task<ProductDto?> UpdateAsync(long id, UpdateProductRequest request, CancellationToken ct = default);
    Task<ProductDto?> AdjustStockAsync(long id, StockAdjustmentRequest request, CancellationToken ct = default);
}
