using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Infrastructure.Data;
using WarehouseApp.Infrastructure.Reports;
using WarehouseApp.Infrastructure.Security;
using WarehouseApp.Infrastructure.Services;

namespace WarehouseApp.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers EF Core (Npgsql, snake_case), the Dapper connection factory, and the
    /// application services. Reads the connection string from
    /// <c>ConnectionStrings:Default</c> (appsettings, user-secrets, or the
    /// <c>ConnectionStrings__Default</c> environment variable).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var configuredConnectionString = config.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(configuredConnectionString))
        {
            throw new InvalidOperationException(
                "Thiếu chuỗi kết nối 'ConnectionStrings:Default'. Hãy cấu hình trong appsettings, " +
                "user-secrets hoặc biến môi trường ConnectionStrings__Default. " +
                "Với Supabase, hãy dùng pooler host, ví dụ: " +
                "Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;" +
                "Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=VerifyFull;Trust Server Certificate=false");
        }

        var connectionBuilder = new NpgsqlConnectionStringBuilder(configuredConnectionString);
        var trustsServerCertificate = configuredConnectionString
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => part.Split('=', 2, StringSplitOptions.TrimEntries))
            .Where(parts => parts.Length == 2 &&
                            parts[0].Replace(" ", string.Empty, StringComparison.Ordinal)
                                .Equals("TrustServerCertificate", StringComparison.OrdinalIgnoreCase))
            .Any(parts => parts[1].Equals("true", StringComparison.OrdinalIgnoreCase));
        if (trustsServerCertificate || connectionBuilder.SslMode != SslMode.VerifyFull)
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Default phải dùng SSL Mode=VerifyFull và Trust Server Certificate=false.");
        }

        var caCertificatePath = config["Database:CaCertificatePath"];
        if (!string.IsNullOrWhiteSpace(caCertificatePath))
        {
            if (!File.Exists(caCertificatePath))
            {
                throw new InvalidOperationException(
                    $"Không tìm thấy CA certificate tại '{caCertificatePath}'.");
            }

            connectionBuilder.RootCertificate = caCertificatePath;
        }

        var cs = connectionBuilder.ConnectionString;

        // Dapper: map snake_case columns (quantity_on_hand) to PascalCase DTO members.
        DefaultTypeMap.MatchNamesWithUnderscores = true;

        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(cs).UseSnakeCaseNamingConvention());

        services.AddSingleton<IDbConnectionFactory>(_ => new NpgsqlConnectionFactory(cs));
        services.AddSingleton<ISmtpPasswordProtector>(
            _ => new SmtpPasswordProtector(config[SmtpPasswordProtector.ConfigurationKey]));

        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IMaterialService, MaterialService>();
        services.AddScoped<IBackboardService, BackboardService>();
        services.AddScoped<ISubBackboardService, SubBackboardService>();
        services.AddScoped<IFrameService, FrameService>();
        services.AddScoped<IInventoryTransactionService, InventoryTransactionService>();
        services.AddScoped<IPricingService, PricingService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IReportQueries, DapperReportQueries>();
        services.AddScoped<IWooCommerceService, WooCommerceService>();

        return services;
    }
}
