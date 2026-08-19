using System.Security.Claims;
using System.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class AuthorizationEndpointTests : IClassFixture<AuthorizationWebApplicationFactory>
{
    private readonly HttpClient client;

    public AuthorizationEndpointTests(AuthorizationWebApplicationFactory factory) =>
        client = factory.CreateClient();

    [Fact]
    public async Task AnonymousCannotAccessAdminEndpoint()
    {
        var response = await client.GetAsync("/api/reports/low-stock");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task StaffCannotAccessAdminEndpoint()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/reports/low-stock");
        request.Headers.Add("X-Test-Role", "Staff");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminCanAccessAdminEndpoint()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/reports/low-stock");
        request.Headers.Add("X-Test-Role", "Admin");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AdminWithUnchangedPasswordCannotAccessAdminEndpoint()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/reports/low-stock");
        request.Headers.Add("X-Test-Role", "Admin");
        request.Headers.Add("X-Test-Must-Change-Password", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/inventory")]
    [InlineData("/api/inventory/1")]
    [InlineData("/api/invoices")]
    [InlineData("/api/invoices/INV-TEST")]
    [InlineData("/api/customers")]
    [InlineData("/api/customers/1")]
    [InlineData("/api/categories")]
    [InlineData("/api/categories/1")]
    [InlineData("/api/materials")]
    [InlineData("/api/materials/1")]
    [InlineData("/api/backboards")]
    [InlineData("/api/backboards/1")]
    [InlineData("/api/sub-backboards")]
    [InlineData("/api/sub-backboards/1")]
    [InlineData("/api/frames")]
    [InlineData("/api/frames/1")]
    [InlineData("/api/inventory-transactions")]
    [InlineData("/api/inventory-transactions/1")]
    [InlineData("/api/woocommerce/orders")]
    [InlineData("/api/woocommerce/orders/1")]
    [InlineData("/api/woocommerce/orders/status-reasons")]
    [InlineData("/api/pricing/rate-card")]
    [InlineData("/api/settings/smtp")]
    [InlineData("/api/audit")]
    [InlineData("/api/accounts")]
    [InlineData("/api/reports/low-stock")]
    [InlineData("/api/reports/sales-overview")]
    [InlineData("/api/reports/sales-summary")]
    [InlineData("/api/reports/top-products")]
    [InlineData("/api/reports/top-customers")]
    [InlineData("/api/reports/inventory-flow")]
    [InlineData("/api/reports/invoice-details")]
    public async Task AnonymousCannotAccessEveryProtectedBusinessRoute(string path)
    {
        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/pricing/rate-card")]
    [InlineData("/api/pricing/components/1")]
    [InlineData("/api/settings/smtp")]
    [InlineData("/api/audit")]
    [InlineData("/api/accounts")]
    [InlineData("/api/accounts/1")]
    [InlineData("/api/reports/low-stock")]
    [InlineData("/api/reports/sales-overview")]
    [InlineData("/api/reports/sales-summary")]
    [InlineData("/api/reports/top-products")]
    [InlineData("/api/reports/top-customers")]
    [InlineData("/api/reports/inventory-flow")]
    [InlineData("/api/reports/invoice-details")]
    public async Task StaffCannotAccessEveryAdminRoute(string path)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("X-Test-Role", "Staff");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("POST", "/api/inventory")]
    [InlineData("PUT", "/api/inventory/1")]
    [InlineData("POST", "/api/inventory/1/adjust")]
    [InlineData("POST", "/api/inventory/1/image")]
    [InlineData("DELETE", "/api/inventory/1/image")]
    [InlineData("POST", "/api/inventory-transactions")]
    [InlineData("POST", "/api/inventory-transactions/backboard-conversions")]
    [InlineData("POST", "/api/invoices")]
    [InlineData("PUT", "/api/invoices/INV-TEST/lines")]
    [InlineData("POST", "/api/customers")]
    [InlineData("PUT", "/api/customers/1")]
    [InlineData("POST", "/api/categories")]
    [InlineData("PUT", "/api/categories/1")]
    [InlineData("POST", "/api/materials")]
    [InlineData("PUT", "/api/materials/1")]
    [InlineData("POST", "/api/backboards")]
    [InlineData("PUT", "/api/backboards/1")]
    [InlineData("POST", "/api/sub-backboards")]
    [InlineData("PUT", "/api/sub-backboards/1")]
    [InlineData("POST", "/api/frames")]
    [InlineData("PUT", "/api/frames/1")]
    [InlineData("POST", "/api/woocommerce/orders/1/confirm")]
    [InlineData("PUT", "/api/woocommerce/orders/1/status")]
    [InlineData("GET", "/api/woocommerce/products/1/link")]
    [InlineData("DELETE", "/api/woocommerce/products/1/link")]
    [InlineData("PUT", "/api/woocommerce/products/1/link")]
    [InlineData("POST", "/api/woocommerce/products/sync")]
    [InlineData("POST", "/api/woocommerce/products/publish-link")]
    public async Task AnonymousCannotAccessProtectedBusinessMethods(string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("PUT", "/api/pricing/rate-card")]
    [InlineData("PUT", "/api/pricing/components/1")]
    [InlineData("PUT", "/api/settings/smtp")]
    [InlineData("POST", "/api/accounts")]
    [InlineData("PUT", "/api/accounts/1")]
    [InlineData("POST", "/api/woocommerce/orders/sync")]
    [InlineData("POST", "/api/woocommerce/products/sync")]
    [InlineData("PUT", "/api/woocommerce/products/1/link")]
    public async Task StaffCannotAccessProtectedAdminMethods(string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        request.Headers.Add("X-Test-Role", "Staff");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}

public sealed class AuthorizationWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", "Host=localhost;Port=5432;Database=test;Username=test;Password=test;SSL Mode=VerifyFull");
        builder.UseSetting("Authentication:SigningKey", new string('t', 32));
        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthenticationHandler.TestScheme;
                options.DefaultChallengeScheme = TestAuthenticationHandler.TestScheme;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(
                TestAuthenticationHandler.TestScheme, _ => { });

            services.AddSingleton<IReportQueries, FakeReportQueries>();
        });
    }
}

public sealed class TestAuthenticationHandler(
    Microsoft.Extensions.Options.IOptionsMonitor<AuthenticationSchemeOptions> options,
    Microsoft.Extensions.Logging.ILoggerFactory logger,
    System.Text.Encodings.Web.UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string TestScheme = "TestAuthentication";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-Role", out var role) || string.IsNullOrWhiteSpace(role))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new[]
        {
            new Claim(ClaimTypes.Role, role.ToString()),
            new Claim("role_id", role.ToString() == "Admin" ? "1" : "2"),
            new Claim("sub", "1"),
            new Claim("sid", Guid.NewGuid().ToString()),
            new Claim("must_change_password", Request.Headers["X-Test-Must-Change-Password"] == "true" ? "true" : "false"),
        };
        var identity = new ClaimsIdentity(claims, TestScheme);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), TestScheme)));
    }
}

public sealed class FakeReportQueries : IReportQueries
{
    public Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<LowStockItemDto>>(Array.Empty<LowStockItemDto>());
    public Task<SalesOverviewDto> GetSalesOverviewAsync(SalesReportFilter filter, CancellationToken ct = default) =>
        Task.FromResult(new SalesOverviewDto(0, 0, 0, 0));
    public Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(SalesReportFilter filter, string groupBy, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<SalesSummaryRowDto>>(Array.Empty<SalesSummaryRowDto>());
    public Task<IReadOnlyList<TopProductDto>> GetTopProductsAsync(SalesReportFilter filter, int limit, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<TopProductDto>>(Array.Empty<TopProductDto>());
    public Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(SalesReportFilter filter, int limit, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<TopCustomerDto>>(Array.Empty<TopCustomerDto>());
    public Task<IReadOnlyList<InventoryFlowRowDto>> GetInventoryFlowAsync(DateOnly from, DateOnly to, short? transactionType, string? itemType, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<InventoryFlowRowDto>>(Array.Empty<InventoryFlowRowDto>());
    public Task<PagedResult<InvoiceReportRowDto>> GetInvoiceDetailsAsync(SalesReportFilter filter, int page, int pageSize, CancellationToken ct = default) =>
        Task.FromResult(new PagedResult<InvoiceReportRowDto>(Array.Empty<InvoiceReportRowDto>(), page, pageSize, 0));
}
