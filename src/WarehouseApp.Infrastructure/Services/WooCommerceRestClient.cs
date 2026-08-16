using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace WarehouseApp.Infrastructure.Services;

public sealed class WooCommerceOptions
{
    public const string SectionName = "WooCommerce";
    public string? BaseUrl { get; set; }
    public string? ConsumerKey { get; set; }
    public string? ConsumerSecret { get; set; }
    public string? WebhookSecret { get; set; }
}

/// <summary>Server-side only client for the current WooCommerce REST API namespace.</summary>
public sealed class WooCommerceRestClient(HttpClient httpClient, IOptions<WooCommerceOptions> options)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly WooCommerceOptions _options = options.Value;

    public async Task<IReadOnlyList<WooCommerceRemoteOrder>> GetOrdersAsync(CancellationToken ct)
    {
        EnsureConfigured();
        var result = new List<WooCommerceRemoteOrder>();
        for (var page = 1; ; page++)
        {
            using var request = CreateRequest(HttpMethod.Get, $"orders?per_page=100&page={page}&orderby=date&order=asc");
            using var response = await httpClient.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            var payload = await response.Content.ReadAsByteArrayAsync(ct);
            var batch = JsonSerializer.Deserialize<List<WooCommerceRemoteOrder>>(payload, JsonOptions) ?? [];
            result.AddRange(batch);
            if (batch.Count < 100) break;
        }
        return result;
    }

    public WooCommerceRemoteOrder ParseOrder(ReadOnlySpan<byte> payload) =>
        JsonSerializer.Deserialize<WooCommerceRemoteOrder>(payload, JsonOptions)
        ?? throw new InvalidOperationException("Webhook WooCommerce không chứa đơn hàng hợp lệ.");

    public async Task UpdateProductAsync(long productId, long? variationId, WooCommerceCatalogUpdate update, CancellationToken ct)
    {
        EnsureConfigured();
        var path = variationId is > 0
            ? $"products/{productId}/variations/{variationId.Value}"
            : $"products/{productId}";
        using var request = CreateRequest(HttpMethod.Put, path);
        request.Content = JsonContent.Create(update, options: JsonOptions);
        using var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var root = _options.BaseUrl!.TrimEnd('/');
        var request = new HttpRequestMessage(method, $"{root}/wp-json/wc/v3/{path}");
        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ConsumerKey}:{_options.ConsumerSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return request;
    }

    private void EnsureConfigured()
    {
        if (!Uri.TryCreate(_options.BaseUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps ||
            string.IsNullOrWhiteSpace(_options.ConsumerKey) || string.IsNullOrWhiteSpace(_options.ConsumerSecret))
            throw new InvalidOperationException("Thiếu cấu hình WooCommerce hợp lệ. Cần WooCommerce:BaseUrl HTTPS, ConsumerKey và ConsumerSecret ở backend.");
    }
}

public sealed record WooCommerceRemoteOrder(
    long Id,
    string Number,
    string Status,
    string? Currency,
    string? Total,
    DateTimeOffset? DateCreatedGmt,
    DateTimeOffset? DateModifiedGmt,
    WooCommerceRemoteAddress? Billing,
    WooCommerceRemoteAddress? Shipping,
    List<WooCommerceRemoteOrderItem>? LineItems);

public sealed record WooCommerceRemoteAddress(
    string? FirstName,
    string? LastName,
    string? Address1,
    string? Address2,
    string? City,
    string? State,
    string? Postcode,
    string? Country,
    string? Email,
    string? Phone);

public sealed record WooCommerceRemoteOrderItem(
    long Id,
    long? ProductId,
    long? VariationId,
    string? Name,
    int Quantity,
    string? Price,
    string? Subtotal);

public sealed record WooCommerceCatalogUpdate(
    string Name,
    string RegularPrice,
    bool ManageStock,
    int StockQuantity,
    string StockStatus,
    IReadOnlyList<WooCommerceImageUpdate>? Images);

public sealed record WooCommerceImageUpdate(string Src);
