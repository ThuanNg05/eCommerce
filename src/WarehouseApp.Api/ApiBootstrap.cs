using System.IdentityModel.Tokens.Jwt;
using System.Diagnostics;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WarehouseApp.Api.Endpoints;
using WarehouseApp.Api.Security;
using WarehouseApp.Api.Services;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Security;
using WarehouseApp.Infrastructure;
using WarehouseApp.Infrastructure.Services;
using WarehouseApp.Api.Logging;
using WarehouseApp.Api.Observability;

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
    private const long MaxRequestBodyBytes = 6 * 1024 * 1024;
    private static readonly TimeSpan DefaultRequestTimeout = TimeSpan.FromSeconds(60);

    /// <summary>Origins allowed to call the API: the packaged React app (WebView2 virtual
    /// host) and the Vite dev server.</summary>
    public static readonly string[] DefaultAllowedOrigins = ["https://app.local", "http://localhost:5173"];

    public static void AddApiServices(IServiceCollection services, IConfiguration config)
    {
        services.AddLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddJsonConsole(options =>
                options.JsonWriterOptions = new JsonWriterOptions { Indented = false });
            logging.AddProvider(new RollingFileLoggerProvider(
                Path.Combine(AppContext.BaseDirectory, "logs"),
                maxFileBytes: 10 * 1024 * 1024,
                retainedFileCount: 7));
        });
        services.AddSingleton<ApiMetrics>();

        services.Configure<KestrelServerOptions>(options =>
            options.Limits.MaxRequestBodySize = MaxRequestBodyBytes);
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
        });
        services.Configure<BrotliCompressionProviderOptions>(options =>
            options.Level = System.IO.Compression.CompressionLevel.Fastest);
        services.Configure<GzipCompressionProviderOptions>(options =>
            options.Level = System.IO.Compression.CompressionLevel.Fastest);
        services.AddRequestTimeouts(options =>
            options.DefaultPolicy = new RequestTimeoutPolicy { Timeout = DefaultRequestTimeout });
        services.Configure<AuthSettings>(config.GetSection(AuthSettings.SectionName));
        services.Configure<DatabaseReadinessOptions>(config.GetSection(DatabaseReadinessOptions.SectionName));
        services.AddInfrastructure(config);
        services.AddScoped<DatabaseReadinessChecker>();
        services.Configure<SupabaseStorageOptions>(config.GetSection(SupabaseStorageOptions.SectionName));
        services.AddHttpClient<ProductImageStorage>();
        services.Configure<WooCommerceOptions>(config.GetSection(WooCommerceOptions.SectionName));
        services.AddHttpClient<WooCommerceRestClient>();

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
            options.AddPolicy("PublicInvoiceLookup", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "local",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 30,
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
            p.WithOrigins(ResolveAllowedOrigins(config))
             .AllowAnyHeader()
             .AllowAnyMethod()));

        services.AddEndpointsApiExplorer();
    }

    /// <summary>Combines safe local origins with the explicit production origin(s).
    /// Render accepts this as <c>Cors__AdditionalAllowedOrigins</c>, comma-separated.</summary>
    public static string[] ResolveAllowedOrigins(IConfiguration config)
    {
        var configured = (config["Cors:AdditionalAllowedOrigins"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                             (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
                             string.IsNullOrEmpty(uri.PathAndQuery.Trim('/')))
            .Select(origin => origin.TrimEnd('/'));
        return [.. DefaultAllowedOrigins.Concat(configured).Distinct(StringComparer.OrdinalIgnoreCase)];
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
        app.UseResponseCompression();
        app.UseRequestTimeouts();
        app.UseCors(CorsPolicy);
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();
        app.Use(async (context, next) =>
        {
            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger("WarehouseApp.Api.Requests");
            var metrics = context.RequestServices.GetRequiredService<ApiMetrics>();
            var started = Stopwatch.GetTimestamp();

            try
            {
                await next();
            }
            finally
            {
                var elapsedMs = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
                metrics.Record(elapsedMs, context.Response.StatusCode);
                var accountId = context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? "anonymous";
                var appVersion = context.Request.Headers.TryGetValue("X-Client-Version", out var version)
                    ? version.ToString()
                    : "unknown";

                logger.LogInformation(
                    "HTTP request completed. Method={Method}; Path={Path}; StatusCode={StatusCode}; DurationMs={DurationMs}; AccountId={AccountId}; AppVersion={AppVersion}; CorrelationId={CorrelationId}",
                    context.Request.Method,
                    context.Request.Path.Value ?? "/",
                    context.Response.StatusCode,
                    Math.Round(elapsedMs, 2),
                    accountId,
                    appVersion,
                    context.TraceIdentifier);
            }
        });

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

        app.MapGet("/metrics", (ApiMetrics metrics) => Results.Ok(metrics.Snapshot()))
            .RequireAuthorization("AdminOnly");

        var api = app.MapGroup("/api");
        api.MapAuthEndpoints();
        api.MapPublicInvoiceEndpoints();

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
        secured.MapWooCommerceEndpoints();

        api.MapWooCommerceWebhookEndpoint();

        var admin = api.MapGroup(string.Empty).RequireAuthorization("AdminOnly");
        admin.MapPricingEndpoints();
        admin.MapSettingsEndpoints();
        admin.MapAuditLogEndpoints();
        admin.MapAccountEndpoints();
        admin.MapReportEndpoints();
    }
}
