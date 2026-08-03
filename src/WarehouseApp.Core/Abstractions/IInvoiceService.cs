using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IInvoiceService
{
    Task<IReadOnlyList<InvoiceSummaryDto>> ListAsync(int page, int pageSize, CancellationToken ct = default);
    Task<InvoiceDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<InvoiceDto> CreateAsync(CreateInvoiceRequest request, CancellationToken ct = default);
    Task<InvoiceDto?> IssueAsync(Guid id, CancellationToken ct = default);
}
