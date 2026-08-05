using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<CustomerDto?> GetAsync(long id, CancellationToken ct = default);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken ct = default);
    Task<CustomerDto?> UpdateAsync(long id, UpdateCustomerRequest request, CancellationToken ct = default);
}
