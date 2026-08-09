using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IInventoryTransactionService
{
    Task<PagedResult<InventoryTransactionDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<InventoryTransactionDto?> GetAsync(long id, CancellationToken ct = default);
    Task<InventoryTransactionDto> CreateAsync(CreateInventoryTransactionRequest request, CancellationToken ct = default);
    Task<InventoryTransactionDto> CreateBackboardConversionAsync(
        CreateBackboardConversionRequest request,
        CancellationToken ct = default);
}
