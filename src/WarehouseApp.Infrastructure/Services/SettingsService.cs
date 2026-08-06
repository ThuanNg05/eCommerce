using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>
/// Reads/writes the singleton SMTP config (id = 1). The stored app password is never
/// returned to callers; an empty <see cref="UpdateSmtpConfigRequest.AppPassword"/> leaves
/// the existing secret untouched so editing the address/duration doesn't wipe it.
/// </summary>
public class SettingsService(AppDbContext db) : ISettingsService
{
    public async Task<SmtpConfigDto> GetSmtpAsync(CancellationToken ct = default)
    {
        var s = await db.SmtpConfigs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == 1, ct);
        return s is null
            ? new SmtpConfigDto(string.Empty, false, null, default)
            : ToDto(s);
    }

    public async Task<SmtpConfigDto> UpdateSmtpAsync(UpdateSmtpConfigRequest r, CancellationToken ct = default)
    {
        var s = await db.SmtpConfigs.FirstOrDefaultAsync(x => x.Id == 1, ct);
        if (s is null)
        {
            s = new SmtpConfig { Id = 1 };
            db.SmtpConfigs.Add(s);
        }

        s.Address = r.Address?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(r.AppPassword))
            s.HashedPassApp = r.AppPassword; // stored as provided — the app needs it to authenticate
        s.Duration = r.Duration;
        s.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(s);
    }

    private static SmtpConfigDto ToDto(SmtpConfig s) =>
        new(s.Address, !string.IsNullOrEmpty(s.HashedPassApp), s.Duration, s.UpdatedAt);
}
