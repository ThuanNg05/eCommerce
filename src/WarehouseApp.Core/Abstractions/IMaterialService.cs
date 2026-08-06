using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IMaterialService
{
    Task<PagedResult<MaterialDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<MaterialDto?> GetAsync(long id, CancellationToken ct = default);
    Task<MaterialDto> CreateAsync(CreateMaterialRequest request, CancellationToken ct = default);
    Task<MaterialDto?> UpdateAsync(long id, UpdateMaterialRequest request, CancellationToken ct = default);
}
