using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
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
            .Select(i => new InvoiceSummaryDto(i.Id, i.CustomerId, i.Total, i.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<InvoiceDto?> GetAsync(string id, CancellationToken ct = default)
    {
        var inv = await db.Invoices.AsNoTracking()
            .Include(i => i.Details)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        return inv is null ? null : ToDto(inv);
    }

    public async Task<InvoiceDto> CreateAsync(CreateInvoiceRequest r, CancellationToken ct = default)
    {
        if (r.Lines is null || r.Lines.Count == 0)
            throw new DomainValidationException("Hóa đơn phải có ít nhất một dòng sản phẩm.");

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == r.CustomerId, ct);
        if (customer is null)
            throw new DomainValidationException("Khách hàng không tồn tại.");

        // A single transaction covers stock decrement + invoice insert so a failure
        // leaves neither applied. Retry-on-failure is intentionally NOT enabled on the
        // DbContext; if it is turned on, wrap this block in an execution strategy.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Serialize invoice-code allocation across stations. The lock is automatically
        // released at commit/rollback and does not require a schema-side sequence.
        await db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock(hashtext('warehouse.invoices.create'))", ct);

        var ids = r.Lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);

        var invoice = new Invoice
        {
            Id = await NextIdAsync(ct),
            CustomerId = r.CustomerId
        };

        decimal total = 0m;
        // invoice_detail has (invoice_id, product_id) as its primary key, so one product
        // may appear only once per invoice.
        foreach (var group in r.Lines.GroupBy(l => l.ProductId))
        {
            var productId = group.Key;
            var quantity = group.Sum(l => l.Quantity);

            if (group.Count() != 1)
                throw new DomainValidationException("Một sản phẩm chỉ được xuất hiện một lần trong hóa đơn.");

            var line = group.Single();

            if (!products.TryGetValue(productId, out var p))
                throw new DomainValidationException("Sản phẩm không tồn tại.");
            if (quantity <= 0)
                throw new DomainValidationException($"Số lượng của sản phẩm '{p.Sku}' phải lớn hơn 0.");
            if (p.InStock < quantity)
                throw DomainErrors.InsufficientStock();

            p.InStock -= quantity;
            p.UpdatedAt = DateTimeOffset.UtcNow;

            var unitPrice = line.UnitPrice ?? DefaultUnitPrice(customer, p);
            if (unitPrice < 0)
                throw new DomainValidationException($"Đơn giá của sản phẩm '{p.Sku}' không được âm.");

            var description = NormalizeLineDescription(line.Description);
            var subtotal = unitPrice * quantity;
            total += subtotal;

            invoice.Details.Add(new InvoiceDetail
            {
                ProductId = p.Id,
                ProductName = p.Name,
                UnitPrice = unitPrice,
                Quantity = quantity,
                Subtotal = subtotal,
                Description = description
            });
        }

        invoice.Total = total;

        db.Invoices.Add(invoice);
        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Tồn kho đã thay đổi trong lúc tạo hóa đơn. Vui lòng thử lại.");
        }

        return ToDto(invoice);
    }

    public async Task<InvoiceDto?> UpdateLinesAsync(string id, UpdateInvoiceLinesRequest r, CancellationToken ct = default)
    {
        if (r.Lines is null || r.Lines.Count == 0)
            throw new DomainValidationException("Hóa đơn phải có ít nhất một dòng sản phẩm.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtext({"warehouse.invoices.update:" + id}))", ct);

        var invoice = await db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Details)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return null;

        var lastEditableDate = VietnamBusinessTime.DateOf(invoice.CreatedAt).AddDays(2);
        if (VietnamBusinessTime.Today > lastEditableDate)
            throw new DomainValidationException(
                $"Hóa đơn chỉ được chỉnh sửa hàng hóa đến hết ngày {lastEditableDate:dd/MM/yyyy}.");

        // Return the old quantities before applying the replacement lines. The entire
        // operation remains atomic, so any later validation failure rolls this back.
        var oldDetails = invoice.Details.ToList();
        var requestedProductIds = r.Lines.Select(l => l.ProductId).Distinct().ToList();
        var allProductIds = oldDetails.Select(d => d.ProductId).Concat(requestedProductIds).Distinct().ToList();
        var products = await db.Products.Where(p => allProductIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);

        foreach (var oldLine in oldDetails)
        {
            if (!products.TryGetValue(oldLine.ProductId, out var product))
                throw new DomainValidationException("Không tìm thấy sản phẩm của hóa đơn hiện tại.");

            product.InStock += oldLine.Quantity;
            product.UpdatedAt = DateTimeOffset.UtcNow;
        }

        db.InvoiceDetails.RemoveRange(oldDetails);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Hóa đơn hoặc tồn kho đã được cập nhật ở máy khác. Vui lòng tải lại và thử lại.");
        }

        invoice.Details.Clear();
        decimal total = 0m;
        foreach (var group in r.Lines.GroupBy(l => l.ProductId))
        {
            if (group.Count() != 1)
                throw new DomainValidationException("Một sản phẩm chỉ được xuất hiện một lần trong hóa đơn.");

            var line = group.Single();
            if (!products.TryGetValue(line.ProductId, out var product))
                throw new DomainValidationException("Sản phẩm không tồn tại.");
            if (line.Quantity <= 0)
                throw new DomainValidationException($"Số lượng của sản phẩm '{product.Sku}' phải lớn hơn 0.");
            if (product.InStock < line.Quantity)
                throw DomainErrors.InsufficientStock();

            var unitPrice = line.UnitPrice ?? DefaultUnitPrice(invoice.Customer!, product);
            if (unitPrice < 0)
                throw new DomainValidationException($"Đơn giá của sản phẩm '{product.Sku}' không được âm.");

            product.InStock -= line.Quantity;
            product.UpdatedAt = DateTimeOffset.UtcNow;

            var subtotal = unitPrice * line.Quantity;
            total += subtotal;
            invoice.Details.Add(new InvoiceDetail
            {
                ProductId = product.Id,
                ProductName = product.Name,
                UnitPrice = unitPrice,
                Quantity = line.Quantity,
                Subtotal = subtotal,
                Description = NormalizeLineDescription(line.Description)
            });
        }

        invoice.Total = total;
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Hóa đơn hoặc tồn kho đã được cập nhật ở máy khác. Vui lòng tải lại và thử lại.");
        }

        return ToDto(invoice);
    }

    /// <summary>Generates a business code like <c>INV-20260805-0001</c> (≤ 20 chars).</summary>
    private async Task<string> NextIdAsync(CancellationToken ct)
    {
        var prefix = $"INV-{VietnamBusinessTime.Today:yyyyMMdd}-";
        var todayCount = await db.Invoices.CountAsync(i => i.Id.StartsWith(prefix), ct);
        return $"{prefix}{todayCount + 1:D4}";
    }

    private static decimal DefaultUnitPrice(Customer customer, Product product) =>
        customer.GroupPrice == "S"
            ? product.PriceWholesale ?? product.PriceRetail ?? product.BasePrice
            : product.PriceRetail ?? product.BasePrice;

    private static string? NormalizeLineDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description)) return null;
        var normalized = description.Trim();
        if (normalized.Length > 255)
            throw new DomainValidationException("Ghi chú của dòng hóa đơn không được quá 255 ký tự.");
        return normalized;
    }

    private static InvoiceDto ToDto(Invoice i) => new(
        i.Id, i.CustomerId, i.Total, i.CreatedAt, i.UpdatedAt,
        i.Details.Select(d => new InvoiceLineDto(d.ProductId, d.ProductName, d.Quantity, d.UnitPrice, d.Subtotal, d.Description)).ToList());
}
