using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Core.Enums;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class InvoiceService(AppDbContext db) : IInvoiceService
{
    public async Task<IReadOnlyList<InvoiceSummaryDto>> ListAsync(int page, int pageSize, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        return await db.Invoices.AsNoTracking()
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new InvoiceSummaryDto(i.Id, i.Number, i.CustomerName, i.Status, i.CreatedAt, i.Total))
            .ToListAsync(ct);
    }

    public async Task<InvoiceDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.AsNoTracking()
            .Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        return inv is null ? null : ToDto(inv);
    }

    public async Task<InvoiceDto> CreateAsync(CreateInvoiceRequest r, CancellationToken ct = default)
    {
        if (r.Lines is null || r.Lines.Count == 0)
            throw new DomainValidationException("An invoice must contain at least one line.");
        if (r.TaxRate is < 0 or > 1)
            throw new DomainValidationException("Tax rate must be between 0 and 1 (e.g. 0.10 for 10%).");

        // A single transaction covers stock decrement + invoice insert so a failure
        // leaves neither applied.
        // NOTE: retry-on-failure is intentionally NOT enabled on the DbContext. If you
        // turn on EnableRetryOnFailure, wrap this whole block in
        // db.Database.CreateExecutionStrategy().ExecuteAsync(...) and keep it idempotent —
        // otherwise EF throws because the execution strategy can't span a user transaction.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var ids = r.Lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);

        var invoice = new Invoice
        {
            CustomerName = r.CustomerName.Trim(),
            TaxRate = r.TaxRate,
            Status = InvoiceStatus.Draft,
            Number = await NextNumberAsync(ct)
        };

        decimal subtotal = 0m;
        foreach (var line in r.Lines)
        {
            if (!products.TryGetValue(line.ProductId, out var p))
                throw new DomainValidationException($"Product {line.ProductId} does not exist.");
            if (line.Quantity <= 0)
                throw new DomainValidationException($"Quantity for '{p.Sku}' must be positive.");
            if (p.QuantityOnHand < line.Quantity)
                throw new DomainValidationException($"Insufficient stock for '{p.Sku}': on hand {p.QuantityOnHand}, requested {line.Quantity}.");

            p.QuantityOnHand -= line.Quantity;
            p.UpdatedAt = DateTimeOffset.UtcNow;

            var lineTotal = p.UnitPrice * line.Quantity;
            subtotal += lineTotal;

            invoice.Lines.Add(new InvoiceLine
            {
                ProductId = p.Id,
                Sku = p.Sku,
                Description = p.Name,
                Quantity = line.Quantity,
                UnitPrice = p.UnitPrice,
                LineTotal = lineTotal
            });
        }

        invoice.Subtotal = subtotal;
        invoice.TaxAmount = Math.Round(subtotal * r.TaxRate, 2, MidpointRounding.AwayFromZero);
        invoice.Total = invoice.Subtotal + invoice.TaxAmount;

        db.Invoices.Add(invoice);
        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Stock changed while creating the invoice. Please retry.");
        }

        return ToDto(invoice);
    }

    public async Task<InvoiceDto?> IssueAsync(Guid id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct);
        if (inv is null) return null;
        if (inv.Status != InvoiceStatus.Draft)
            throw new DomainValidationException($"Only draft invoices can be issued (current status: {inv.Status}).");

        inv.Status = InvoiceStatus.Issued;
        inv.IssuedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(inv);
    }

    private async Task<string> NextNumberAsync(CancellationToken ct)
    {
        var prefix = $"INV-{DateTime.UtcNow:yyyyMMdd}-";
        var todayCount = await db.Invoices.CountAsync(i => i.Number.StartsWith(prefix), ct);
        return $"{prefix}{todayCount + 1:D4}";
    }

    private static InvoiceDto ToDto(Invoice i) => new(
        i.Id, i.Number, i.CustomerName, i.Status, i.CreatedAt, i.IssuedAt,
        i.Subtotal, i.TaxRate, i.TaxAmount, i.Total,
        i.Lines.Select(l => new InvoiceLineDto(l.Id, l.ProductId, l.Sku, l.Description, l.Quantity, l.UnitPrice, l.LineTotal)).ToList());
}
