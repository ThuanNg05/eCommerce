using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface ICategoryService
{
    Task<PagedResult<CategoryDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<CategoryDto?> GetAsync(long id, CancellationToken ct = default);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken ct = default);
    Task<CategoryDto?> UpdateAsync(long id, UpdateCategoryRequest request, CancellationToken ct = default);
}
