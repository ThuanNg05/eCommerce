using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Infrastructure.Data;
using WarehouseApp.Infrastructure.Reports;
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
        var cs = config.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(cs))
        {
            throw new InvalidOperationException(
                "Missing connection string 'ConnectionStrings:Default'. Set it via appsettings, " +
                "user-secrets, or the environment variable ConnectionStrings__Default. " +
                "For Supabase use the pooler host, e.g. " +
                "Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;" +
                "Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=Require;Trust Server Certificate=true");
        }

        // Dapper: map snake_case columns (quantity_on_hand) to PascalCase DTO members.
        DefaultTypeMap.MatchNamesWithUnderscores = true;

        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(cs).UseSnakeCaseNamingConvention());

        services.AddSingleton<IDbConnectionFactory>(_ => new NpgsqlConnectionFactory(cs));

        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IMaterialService, MaterialService>();
        services.AddScoped<IBackboardService, BackboardService>();
        services.AddScoped<ISubBackboardService, SubBackboardService>();
        services.AddScoped<IFrameService, FrameService>();
        services.AddScoped<IReportQueries, DapperReportQueries>();

        return services;
    }
}
