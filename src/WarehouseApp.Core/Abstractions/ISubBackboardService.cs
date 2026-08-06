using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface ISubBackboardService
{
    Task<PagedResult<SubBackboardDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<SubBackboardDto?> GetAsync(long id, CancellationToken ct = default);
    Task<SubBackboardDto> CreateAsync(CreateSubBackboardRequest request, CancellationToken ct = default);
    Task<SubBackboardDto?> UpdateAsync(long id, UpdateSubBackboardRequest request, CancellationToken ct = default);
}
