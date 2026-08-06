using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IAuditLogService
{
    Task<PagedResult<AuditLogDto>> ListAsync(int page, int pageSize, string? table, string? action, string? search, CancellationToken ct = default);
}
