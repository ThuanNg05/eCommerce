using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IFrameService
{
    Task<PagedResult<FrameDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<FrameDto?> GetAsync(long id, CancellationToken ct = default);
    Task<FrameDto> CreateAsync(CreateFrameRequest request, CancellationToken ct = default);
    Task<FrameDto?> UpdateAsync(long id, UpdateFrameRequest request, CancellationToken ct = default);
}
