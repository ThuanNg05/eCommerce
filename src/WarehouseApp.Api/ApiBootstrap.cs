using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WarehouseApp.Api.Endpoints;
using WarehouseApp.Infrastructure;

namespace WarehouseApp.Api;

/// <summary>
/// Shared composition root for the HTTP API. Both entry points call these two methods:
///   - the standalone dev server (<c>WarehouseApp.Api/Program.cs</c>), and
///   - the in-process host started by the WPF shell (<c>WarehouseApp.Desktop/App</c>).
/// Keeping registration and routing here means the API behaves identically in dev and prod.
/// </summary>
public static class ApiBootstrap
{
    public const string CorsPolicy = "AppClient";

    /// <summary>Origins allowed to call the API: the packaged React app (WebView2 virtual
    /// host) and the Vite dev server.</summary>
    public static readonly string[] AllowedOrigins = ["https://app.local", "http://localhost:5173"];

    public static void AddApiServices(IServiceCollection services, IConfiguration config)
    {
        services.AddInfrastructure(config);

        services.AddProblemDetails();
        services.AddExceptionHandler<DomainExceptionHandler>();

        services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
            p.WithOrigins(AllowedOrigins)
             .AllowAnyHeader()
             .AllowAnyMethod()));

        services.AddEndpointsApiExplorer();
    }

    public static void UseApiPipeline(WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseCors(CorsPolicy);

        app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

        var api = app.MapGroup("/api");
        api.MapInventoryEndpoints();
        api.MapInvoiceEndpoints();
        api.MapCustomerEndpoints();
        api.MapCategoryEndpoints();
        api.MapMaterialEndpoints();
        api.MapBackboardEndpoints();
        api.MapSubBackboardEndpoints();
        api.MapFrameEndpoints();
        api.MapInventoryTransactionEndpoints();
        api.MapPricingEndpoints();
        api.MapSettingsEndpoints();
        api.MapAuditLogEndpoints();
        api.MapReportEndpoints();
    }
}
