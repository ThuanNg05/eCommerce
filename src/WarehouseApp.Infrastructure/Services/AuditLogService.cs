using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>Read-only view over the trigger-written <c>audit_log</c>, newest first, with
/// optional table/action/record filters.</summary>
public class AuditLogService(AppDbContext db) : IAuditLogService
{
    public async Task<PagedResult<AuditLogDto>> ListAsync(int page, int pageSize, string? table, string? action, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(table))
        {
            var t = table.Trim();
            query = query.Where(a => a.TableName == t);
        }
        if (!string.IsNullOrWhiteSpace(action))
        {
            var ac = action.Trim();
            query = query.Where(a => a.Action == ac);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(a => EF.Functions.ILike(a.RecordId, $"%{s}%") || EF.Functions.ILike(a.TableName, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.ChangedAt).ThenByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.TableName, a.RecordId, a.Action, a.OldValues, a.NewValues, a.ChangedBy, a.ChangedAt))
            .ToListAsync(ct);

        return new PagedResult<AuditLogDto>(items, page, pageSize, total);
    }
}
