using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WarehouseApp.Api.Endpoints;
using WarehouseApp.Api.Security;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Security;
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
        services.Configure<AuthSettings>(config.GetSection(AuthSettings.SectionName));
        services.AddInfrastructure(config);

        var authSettings = config.GetSection(AuthSettings.SectionName).Get<AuthSettings>() ?? new AuthSettings();
        if (authSettings.AccessTokenMinutes is < 1 or > 60)
            throw new InvalidOperationException("Authentication:AccessTokenMinutes phải từ 1 đến 60.");
        if (authSettings.SessionHours is < 1 or > 168)
            throw new InvalidOperationException("Authentication:SessionHours phải từ 1 đến 168.");

        var configuredKey = config[$"{AuthSettings.SectionName}:SigningKey"];
        var keyBytes = string.IsNullOrWhiteSpace(configuredKey)
            ? RandomNumberGenerator.GetBytes(32)
            : Encoding.UTF8.GetBytes(configuredKey);
        if (keyBytes.Length < 32)
            throw new InvalidOperationException("Authentication:SigningKey phải có ít nhất 32 bytes.");

        var signingKey = new SymmetricSecurityKey(keyBytes);
        services.AddSingleton(new JwtSigningKey(signingKey));
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    ValidateIssuer = true,
                    ValidIssuer = authSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = authSettings.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = JwtRegisteredClaimNames.UniqueName,
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                };
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var subject = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        var sid = context.Principal?.FindFirst("sid")?.Value;
                        if (!long.TryParse(subject, out var accountId) || !Guid.TryParse(sid, out var sessionId))
                        {
                            context.Fail("JWT không có định danh session hợp lệ.");
                            return;
                        }

                        var auth = context.HttpContext.RequestServices.GetRequiredService<IAuthService>();
                        if (!await auth.ValidateSessionAsync(sessionId, accountId, context.HttpContext.RequestAborted))
                            context.Fail("Session đã hết hạn hoặc bị thu hồi.");
                    },
                };
            });

        services.AddAuthorization(options =>
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin")));

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
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

        var api = app.MapGroup("/api");
        api.MapAuthEndpoints();

        var secured = api.MapGroup(string.Empty).RequireAuthorization();
        secured.MapInventoryEndpoints();
        secured.MapInvoiceEndpoints();
        secured.MapCustomerEndpoints();
        secured.MapCategoryEndpoints();
        secured.MapMaterialEndpoints();
        secured.MapBackboardEndpoints();
        secured.MapSubBackboardEndpoints();
        secured.MapFrameEndpoints();
        secured.MapInventoryTransactionEndpoints();

        var admin = api.MapGroup(string.Empty).RequireAuthorization("AdminOnly");
        admin.MapPricingEndpoints();
        admin.MapSettingsEndpoints();
        admin.MapAuditLogEndpoints();
        admin.MapAccountEndpoints();
        admin.MapReportEndpoints();
    }
}
