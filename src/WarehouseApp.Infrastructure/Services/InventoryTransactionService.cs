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
            throw new DomainValidationException("Loại phiếu phải là 1 (Nhập kho) hoặc 2 (Xuất kho).");
        if (r.Details is null || r.Details.Count == 0)
            throw new DomainValidationException("Phiếu kho phải có ít nhất một dòng hàng.");

        var lines = r.Details.Select(NormalizeLine).ToList();

        // The slip insert and every stock delta share one transaction, so a failure
        // (e.g. a missing item or an xmin concurrency clash on a product) leaves nothing
        // applied. Mirrors InvoiceService.CreateAsync.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // `MAX(transaction_code) + 1` must not run concurrently on two stations. This
        // transaction-scoped PostgreSQL advisory lock serializes receipt/issue creation
        // until commit/rollback, covering both code allocation and stock updates for the
        // stockable tables that do not have an xmin concurrency token.
        await db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock(hashtext('warehouse.inventory-transactions.create'))", ct);

        await ApplyStockAsync(lines, ct);

        var entity = new InventoryTransaction
        {
            TransactionCode = await NextCodeAsync(ct),
            Type = r.Type,
            TransactionDate = VietnamBusinessTime.Today,
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
            throw new ConcurrencyConflictException("Tồn kho đã thay đổi ở máy khác trong lúc lưu phiếu. Vui lòng thử lại.");
        }

        return ToDto(entity);
    }

    /// <summary>
    /// Converts full backboard sheets into the sub-backboard quantities configured on a
    /// frame/template. The outbound sheet, frame marker, generated inbound lines, and all
    /// stock changes commit atomically as one issue transaction.
    /// </summary>
    public async Task<InventoryTransactionDto> CreateBackboardConversionAsync(
        CreateBackboardConversionRequest request,
        CancellationToken ct = default)
    {
        if (request.BackboardId <= 0)
            throw new DomainValidationException("Vui lòng chọn loại ván ép MDF hoặc HP.");
        if (request.FrameId <= 0)
            throw new DomainValidationException("Vui lòng chọn mã rập.");
        if (request.Quantity <= 0)
            throw new DomainValidationException("Số lượng ván ép xuất theo rập phải lớn hơn 0.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Share the same lock as normal receipts/issues so stock and transaction codes
        // cannot race between two workstations.
        await db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock(hashtext('warehouse.inventory-transactions.create'))", ct);

        var backboard = await db.Backboards.FirstOrDefaultAsync(b => b.Id == request.BackboardId, ct);
        if (backboard is null)
            throw new DomainValidationException($"Không tìm thấy loại ván ép có mã {request.BackboardId}.");
        if (backboard.Status != 1)
            throw new DomainValidationException("Loại ván ép đã ngừng sử dụng.");

        var frame = await db.Frames.AsNoTracking().FirstOrDefaultAsync(f => f.Id == request.FrameId, ct);
        if (frame is null)
            throw new DomainValidationException($"Không tìm thấy rập có mã nội bộ {request.FrameId}.");
        if (frame.Status != 1)
            throw new DomainValidationException($"Rập mã {frame.Code} đã ngừng sử dụng.");

        var recipe = await db.FrameDetails.AsNoTracking()
            .Where(d => d.FrameId == frame.Id && d.Quantity > 0)
            .GroupBy(d => d.SubBackboardId)
            .Select(g => new { SubBackboardId = g.Key, QuantityPerSheet = g.Sum(x => x.Quantity) })
            .ToListAsync(ct);

        if (recipe.Count == 0)
            throw new DomainValidationException($"Rập mã {frame.Code} chưa thiết lập số lượng ván hậu nhỏ.");

        var subIds = recipe.Select(x => x.SubBackboardId).ToList();
        var subBackboards = await db.SubBackboards.Where(s => subIds.Contains(s.Id)).ToListAsync(ct);
        EnsureAllFound(subIds, subBackboards.Select(s => s.Id), "ván hậu nhỏ");

        var inactive = subBackboards.Where(s => s.Status != 1).Select(s => s.Size).ToList();
        if (inactive.Count > 0)
            throw new DomainValidationException(
                $"Rập mã {frame.Code} đang dùng ván hậu nhỏ đã ngừng sử dụng: {string.Join(", ", inactive)}.");

        backboard.InStock = NextStock(
            backboard.InStock,
            -request.Quantity,
            $"ván ép loại {backboard.Type}");
        backboard.UpdatedAt = DateTimeOffset.UtcNow;

        var producedBySubId = new Dictionary<long, int>();
        try
        {
            foreach (var line in recipe)
                producedBySubId[line.SubBackboardId] = checked(line.QuantityPerSheet * request.Quantity);
        }
        catch (OverflowException)
        {
            throw new DomainValidationException("Số lượng ván hậu nhỏ sau quy đổi vượt giới hạn cho phép.");
        }

        foreach (var sub in subBackboards)
        {
            sub.InStock = NextStock(
                sub.InStock,
                producedBySubId[sub.Id],
                $"ván hậu nhỏ '{sub.Size}'");
            sub.UpdatedAt = DateTimeOffset.UtcNow;
        }

        var entity = new InventoryTransaction
        {
            TransactionCode = await NextCodeAsync(ct),
            Type = TypeIssue,
            TransactionDate = VietnamBusinessTime.Today,
            Note = string.IsNullOrWhiteSpace(request.Note)
                ? $"Rập ván hậu mã {frame.Code}"
                : request.Note.Trim(),
        };

        // Marker line preserves which frame/template was used without treating Frame as stock.
        entity.Details.Add(new InventoryTransactionDetail
        {
            FrameId = frame.Id,
            Quantity = request.Quantity,
            UnitPrice = 0,
            TotalPrice = 0,
            Direction = DirectionOut,
        });
        entity.Details.Add(new InventoryTransactionDetail
        {
            BackboardId = backboard.Id,
            Quantity = request.Quantity,
            UnitPrice = backboard.ImportPrice,
            TotalPrice = backboard.ImportPrice * request.Quantity,
            Direction = DirectionOut,
        });
        foreach (var sub in subBackboards.OrderBy(s => s.Id))
        {
            entity.Details.Add(new InventoryTransactionDetail
            {
                SubBackboardId = sub.Id,
                Quantity = producedBySubId[sub.Id],
                UnitPrice = 0,
                TotalPrice = 0,
                Direction = DirectionIn,
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
            throw new ConcurrencyConflictException(
                "Tồn kho đã thay đổi ở máy khác trong lúc rập ván hậu. Vui lòng thử lại.");
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
        int next;
        try
        {
            next = checked(current + delta);
        }
        catch (OverflowException)
        {
            throw new DomainValidationException($"Tồn kho {label} vượt giới hạn cho phép.");
        }
        if (next < 0)
            throw DomainErrors.InsufficientStock();
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
            throw new DomainValidationException($"Không tìm thấy {kind} có mã: {string.Join(", ", missing)}.");
    }

    // ----- helpers -----

    private static NormalizedLine NormalizeLine(CreateTransactionLineRequest d)
    {
        var fks = new long?[] { d.ProductId, d.BackboardId, d.MaterialId, d.FrameId, d.SubBackboardId };
        if (fks.Count(x => x is > 0) != 1)
            throw new DomainValidationException("Mỗi dòng chỉ được chọn đúng một loại hàng hóa.");
        if (d.FrameId is > 0)
            throw new DomainValidationException("Rập được lắp theo đơn và không quản lý tồn kho, nên không thể xuất hiện trong phiếu kho.");
        if (d.Quantity <= 0)
            throw new DomainValidationException("Số lượng của dòng hàng phải lớn hơn 0.");
        if (d.Direction != DirectionIn && d.Direction != DirectionOut)
            throw new DomainValidationException("Hướng giao dịch của dòng hàng phải là 1 (Nhập) hoặc 2 (Xuất).");
        if (d.UnitPrice < 0)
            throw new DomainValidationException("Đơn giá của dòng hàng không được âm.");

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
