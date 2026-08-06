using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IBackboardService
{
    Task<PagedResult<BackboardDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<BackboardDto?> GetAsync(long id, CancellationToken ct = default);
    Task<BackboardDto> CreateAsync(CreateBackboardRequest request, CancellationToken ct = default);
    Task<BackboardDto?> UpdateAsync(long id, UpdateBackboardRequest request, CancellationToken ct = default);
}
