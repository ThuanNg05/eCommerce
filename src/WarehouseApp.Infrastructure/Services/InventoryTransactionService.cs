using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>
/// Warehouse receipt/issue slips (FR009). Creating a transaction moves stock: each line's
/// <c>Direction</c> (1 = In, 2 = Out) is applied to the referenced item's <c>InStock</c>
/// inside a single DB transaction, so the slip and its stock effect commit together.
/// Frames carry no stock (assembled to order) and are rejected on a line.
/// </summary>
public class InventoryTransactionService(AppDbContext db) : IInventoryTransactionService
{
    private const short DirectionIn = 1;
    private const short DirectionOut = 2;
    private const short TypeReceipt = 1;
    private const short TypeIssue = 2;

    public async Task<PagedResult<InventoryTransactionDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.InventoryTransactions.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            if (int.TryParse(s, out var code))
                query = query.Where(t => t.TransactionCode == code);
            else
                query = query.Where(t => t.Note != null && EF.Functions.ILike(t.Note, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .Include(t => t.Details)
            .OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<InventoryTransactionDto>(items.Select(ToDto).ToList(), page, pageSize, total);
    }

    public async Task<InventoryTransactionDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var t = await db.InventoryTransactions.AsNoTracking()
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return t is null ? null : ToDto(t);
    }

    public async Task<InventoryTransactionDto> CreateAsync(CreateInventoryTransactionRequest r, CancellationToken ct = default)
    {
        if (r.Type != TypeReceipt && r.Type != TypeIssue)
            throw new DomainValidationException("Transaction type must be 1 (Nhập/receipt) or 2 (Xuất/issue).");
        if (r.Details is null || r.Details.Count == 0)
            throw new DomainValidationException("A transaction must contain at least one line.");

        var lines = r.Details.Select(NormalizeLine).ToList();

        // The slip insert and every stock delta share one transaction, so a failure
        // (e.g. a missing item or an xmin concurrency clash on a product) leaves nothing
        // applied. Mirrors InvoiceService.CreateAsync.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        await ApplyStockAsync(lines, ct);

        var entity = new InventoryTransaction
        {
            TransactionCode = await NextCodeAsync(ct),
            Type = r.Type,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Note = r.Note,
        };
        foreach (var l in lines)
        {
            entity.Details.Add(new InventoryTransactionDetail
            {
                ProductId = l.ProductId,
                BackboardId = l.BackboardId,
                MaterialId = l.MaterialId,
                SubBackboardId = l.SubBackboardId,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                TotalPrice = l.UnitPrice * l.Quantity,
                Direction = l.Direction,
            });
        }

        db.InventoryTransactions.Add(entity);
        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Stock changed on another station while saving this transaction. Please retry.");
        }

        return ToDto(entity);
    }

    // ----- stock movement -----

    /// <summary>Sums signed deltas per item and applies them to the four stockable kinds,
    /// failing if a referenced item is missing or would go below zero.</summary>
    private async Task ApplyStockAsync(IReadOnlyList<NormalizedLine> lines, CancellationToken ct)
    {
        var products = SumDeltas(lines, l => l.ProductId);
        if (products.Count > 0)
        {
            var items = await db.Products.Where(p => products.Keys.Contains(p.Id)).ToListAsync(ct);
            EnsureAllFound(products.Keys, items.Select(i => i.Id), "product");
            foreach (var p in items)
            {
                p.InStock = NextStock(p.InStock, products[p.Id], $"product '{p.Sku}'");
                p.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        var backboards = SumDeltas(lines, l => l.BackboardId);
        if (backboards.Count > 0)
        {
            var items = await db.Backboards.Where(b => backboards.Keys.Contains(b.Id)).ToListAsync(ct);
            EnsureAllFound(backboards.Keys, items.Select(i => i.Id), "backboard");
            foreach (var b in items)
            {
                b.InStock = NextStock(b.InStock, backboards[b.Id], $"backboard {b.Id}");
                b.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        var materials = SumDeltas(lines, l => l.MaterialId);
        if (materials.Count > 0)
        {
            var items = await db.Materials.Where(m => materials.Keys.Contains(m.Id)).ToListAsync(ct);
            EnsureAllFound(materials.Keys, items.Select(i => i.Id), "material");
            foreach (var m in items)
            {
                m.InStock = NextStock(m.InStock, materials[m.Id], $"material '{m.Name}'");
                m.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        var subs = SumDeltas(lines, l => l.SubBackboardId);
        if (subs.Count > 0)
        {
            var items = await db.SubBackboards.Where(s => subs.Keys.Contains(s.Id)).ToListAsync(ct);
            EnsureAllFound(subs.Keys, items.Select(i => i.Id), "sub-backboard");
            foreach (var s in items)
            {
                s.InStock = NextStock(s.InStock, subs[s.Id], $"sub-backboard '{s.Size}'");
                s.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }
    }

    private static int NextStock(int current, int delta, string label)
    {
        var next = current + delta;
        if (next < 0)
            throw new DomainValidationException($"Transaction would drive {label} below zero (in stock {current}, net change {delta}).");
        return next;
    }

    private static Dictionary<long, int> SumDeltas(IEnumerable<NormalizedLine> lines, Func<NormalizedLine, long?> pick)
    {
        var deltas = new Dictionary<long, int>();
        foreach (var l in lines)
        {
            if (pick(l) is not { } id) continue;
            var signed = l.Direction == DirectionIn ? l.Quantity : -l.Quantity;
            deltas[id] = deltas.GetValueOrDefault(id) + signed;
        }
        return deltas;
    }

    private static void EnsureAllFound(IEnumerable<long> requested, IEnumerable<long> found, string kind)
    {
        var missing = requested.Except(found).ToList();
        if (missing.Count > 0)
            throw new DomainValidationException($"{char.ToUpper(kind[0]) + kind[1..]}(s) not found: {string.Join(", ", missing)}.");
    }

    // ----- helpers -----

    private static NormalizedLine NormalizeLine(CreateTransactionLineRequest d)
    {
        var fks = new long?[] { d.ProductId, d.BackboardId, d.MaterialId, d.FrameId, d.SubBackboardId };
        if (fks.Count(x => x is > 0) != 1)
            throw new DomainValidationException("Each line must reference exactly one item (product, backboard, material, frame, or sub-backboard).");
        if (d.FrameId is > 0)
            throw new DomainValidationException("Frames are assembled to order and carry no stock; they cannot appear on an inventory transaction.");
        if (d.Quantity <= 0)
            throw new DomainValidationException("Line quantity must be positive.");
        if (d.Direction != DirectionIn && d.Direction != DirectionOut)
            throw new DomainValidationException("Line direction must be 1 (In) or 2 (Out).");
        if (d.UnitPrice < 0)
            throw new DomainValidationException("Line unit price cannot be negative.");

        return new NormalizedLine(d.ProductId, d.BackboardId, d.MaterialId, d.SubBackboardId, d.Quantity, d.UnitPrice, d.Direction);
    }

    private async Task<int> NextCodeAsync(CancellationToken ct) =>
        (await db.InventoryTransactions.MaxAsync(x => (int?)x.TransactionCode, ct) ?? 0) + 1;

    private static InventoryTransactionDto ToDto(InventoryTransaction t) => new(
        t.Id, t.TransactionCode, t.Type, t.TransactionDate, t.Note, t.CreatedAt,
        t.Details.Select(d => new TransactionLineDto(
            d.ProductId, d.BackboardId, d.MaterialId, d.FrameId, d.SubBackboardId,
            d.Quantity, d.UnitPrice, d.TotalPrice, d.Direction)).ToList());

    /// <summary>A validated line: frame FK is dropped (rejected upstream), so only the four
    /// stockable kinds survive here.</summary>
    private sealed record NormalizedLine(
        long? ProductId,
        long? BackboardId,
        long? MaterialId,
        long? SubBackboardId,
        int Quantity,
        decimal UnitPrice,
        short Direction);
}
