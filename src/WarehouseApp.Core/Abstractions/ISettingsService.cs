using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface ISettingsService
{
    Task<SmtpConfigDto> GetSmtpAsync(CancellationToken ct = default);
    Task<SmtpConfigDto> UpdateSmtpAsync(UpdateSmtpConfigRequest request, CancellationToken ct = default);
}
