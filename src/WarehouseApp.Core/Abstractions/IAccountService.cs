using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IAccountService
{
    Task<PagedResult<AccountDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task<AccountDto?> GetAsync(long id, CancellationToken ct = default);
    Task<AccountDto> CreateAsync(CreateAccountRequest request, CancellationToken ct = default);
    Task<AccountDto?> UpdateAsync(long id, UpdateAccountRequest request, CancellationToken ct = default);
}
