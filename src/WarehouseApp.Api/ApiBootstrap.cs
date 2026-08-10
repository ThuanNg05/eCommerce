using System.IdentityModel.Tokens.Jwt;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
        services.Configure<DatabaseReadinessOptions>(config.GetSection(DatabaseReadinessOptions.SectionName));
        services.AddInfrastructure(config);
        services.AddScoped<DatabaseReadinessChecker>();

        var authSettings = config.GetSection(AuthSettings.SectionName).Get<AuthSettings>() ?? new AuthSettings();
        if (authSettings.AccessTokenMinutes is < 1 or > 60)
            throw new InvalidOperationException("Authentication:AccessTokenMinutes phải từ 1 đến 60.");
        if (authSettings.SessionHours is < 1 or > 168)
            throw new InvalidOperationException("Authentication:SessionHours phải từ 1 đến 168.");
        if (authSettings.MaxFailedLoginAttempts is < 3 or > 20)
            throw new InvalidOperationException("Authentication:MaxFailedLoginAttempts phải từ 3 đến 20.");
        if (authSettings.LockoutMinutes is < 1 or > 1440)
            throw new InvalidOperationException("Authentication:LockoutMinutes phải từ 1 đến 1440.");

        var keyBytes = JwtSigningKeyStore.Resolve(config);
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
        {
            options.AddPolicy("PasswordChanged", policy =>
                policy.RequireClaim("must_change_password", "false"));
            options.AddPolicy("AdminOnly", policy =>
            {
                policy.RequireRole("Admin");
                policy.RequireClaim("must_change_password", "false");
            });
        });

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";
                await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Title = "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau một phút.",
                    Type = "https://httpstatuses.io/429",
                }, ct);
            };
            options.AddPolicy("AuthLogin", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "local",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true,
                    }));
        });

        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
                context.ProblemDetails.Extensions["correlationId"] = context.HttpContext.TraceIdentifier;
        });
        services.AddExceptionHandler<DomainExceptionHandler>();

        services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
            p.WithOrigins(AllowedOrigins)
             .AllowAnyHeader()
             .AllowAnyMethod()));

        services.AddEndpointsApiExplorer();
    }

    public static void UseApiPipeline(WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
            await next();
        });

        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseCors(CorsPolicy);
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
        app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
        app.MapGet("/health/ready", async (
            DatabaseReadinessChecker checker,
            HttpContext context,
            CancellationToken ct) =>
        {
            var result = await checker.CheckAsync(ct);
            return result.IsReady
                ? Results.Ok(new
                {
                    status = "ready",
                    schemaVersion = result.ActualSchemaVersion,
                    correlationId = context.TraceIdentifier,
                })
                : Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Ứng dụng chưa sẵn sàng kết nối cơ sở dữ liệu.",
                    extensions: new Dictionary<string, object?>
                    {
                        ["code"] = result.Code,
                        ["correlationId"] = context.TraceIdentifier,
                    });
        });

        var api = app.MapGroup("/api");
        api.MapAuthEndpoints();

        var secured = api.MapGroup(string.Empty).RequireAuthorization("PasswordChanged");
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
