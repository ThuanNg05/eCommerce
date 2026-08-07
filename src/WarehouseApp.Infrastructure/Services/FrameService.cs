using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>
/// Frame CRUD including the frame's bill-of-materials lines (<see cref="FrameDetail"/>).
/// FrameDetail has no navigation on Frame, so lines are queried/written via the scalar
/// FrameId column.
/// </summary>
public class FrameService(AppDbContext db) : IFrameService
{
    public async Task<PagedResult<FrameDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Frames.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            if (int.TryParse(s, out var code))
                query = query.Where(f => f.Code == code);
            else
                query = query.Where(f => f.Description != null && EF.Functions.ILike(f.Description, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var frames = await query
            .OrderBy(f => f.Code)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ids = frames.Select(f => f.Id).ToList();
        var lines = await LoadLinesAsync(ids, ct);

        var items = frames
            .Select(f => new FrameDto(f.Id, f.Code, f.Description, f.Status, f.UpdatedAt,
                lines.TryGetValue(f.Id, out var l) ? l : new List<FrameLineDto>()))
            .ToList();

        return new PagedResult<FrameDto>(items, page, pageSize, total);
    }

    public async Task<FrameDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var f = await db.Frames.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (f is null) return null;
        var lines = await LoadLinesAsync(new[] { id }, ct);
        return new FrameDto(f.Id, f.Code, f.Description, f.Status, f.UpdatedAt,
            lines.TryGetValue(id, out var l) ? l : new List<FrameLineDto>());
    }

    public async Task<FrameDto> CreateAsync(CreateFrameRequest r, CancellationToken ct = default)
    {
        if (await db.Frames.AnyAsync(f => f.Code == r.Code, ct))
            throw new DomainValidationException($"Mẫu rập có mã '{r.Code}' đã tồn tại.");

        var lines = await NormalizeLinesAsync(r.Lines, ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var frame = new Frame { Code = r.Code, Description = r.Description, Status = 1 };
        db.Frames.Add(frame);
        await db.SaveChangesAsync(ct); // assigns frame.Id

        AddLines(frame.Id, lines);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new FrameDto(frame.Id, frame.Code, frame.Description, frame.Status, frame.UpdatedAt, ToLineDtos(lines));
    }

    public async Task<FrameDto?> UpdateAsync(long id, UpdateFrameRequest r, CancellationToken ct = default)
    {
        var frame = await db.Frames.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (frame is null) return null;

        if (await db.Frames.AnyAsync(f => f.Id != id && f.Code == r.Code, ct))
            throw new DomainValidationException($"Mẫu rập có mã '{r.Code}' đã tồn tại.");

        var lines = await NormalizeLinesAsync(r.Lines, ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        frame.Code = r.Code;
        frame.Description = r.Description;
        frame.Status = r.Status;
        frame.UpdatedAt = DateTimeOffset.UtcNow;

        // Replace the BOM: drop existing lines, insert the new set.
        var existing = await db.FrameDetails.Where(d => d.FrameId == id).ToListAsync(ct);
        db.FrameDetails.RemoveRange(existing);
        AddLines(id, lines);

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new FrameDto(frame.Id, frame.Code, frame.Description, frame.Status, frame.UpdatedAt, ToLineDtos(lines));
    }

    // ----- helpers -----

    /// <summary>Consolidate duplicate sub-backboard lines (sum qty), drop non-positive,
    /// and verify every referenced sub-backboard exists.</summary>
    private async Task<Dictionary<long, int>> NormalizeLinesAsync(IReadOnlyList<FrameLineRequest>? lines, CancellationToken ct)
    {
        var consolidated = (lines ?? Array.Empty<FrameLineRequest>())
            .Where(l => l.Quantity > 0)
            .GroupBy(l => l.SubBackboardId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));

        if (consolidated.Count > 0)
        {
            var refIds = consolidated.Keys.ToList();
            var found = await db.SubBackboards.Where(s => refIds.Contains(s.Id)).Select(s => s.Id).ToListAsync(ct);
            var missing = refIds.Except(found).ToList();
            if (missing.Count > 0)
                throw new DomainValidationException($"Không tìm thấy tấm lót phụ có mã: {string.Join(", ", missing)}.");
        }

        return consolidated;
    }

    private void AddLines(long frameId, Dictionary<long, int> lines)
    {
        foreach (var (subId, qty) in lines)
            db.FrameDetails.Add(new FrameDetail { FrameId = frameId, SubBackboardId = subId, Quantity = qty });
    }

    private async Task<Dictionary<long, List<FrameLineDto>>> LoadLinesAsync(IReadOnlyCollection<long> frameIds, CancellationToken ct)
    {
        if (frameIds.Count == 0) return new();
        var details = await db.FrameDetails.AsNoTracking()
            .Where(d => frameIds.Contains(d.FrameId))
            .ToListAsync(ct);
        return details
            .GroupBy(d => d.FrameId)
            .ToDictionary(g => g.Key, g => g.Select(d => new FrameLineDto(d.SubBackboardId, d.Quantity)).ToList());
    }

    private static List<FrameLineDto> ToLineDtos(Dictionary<long, int> lines) =>
        lines.Select(kv => new FrameLineDto(kv.Key, kv.Value)).ToList();
}
