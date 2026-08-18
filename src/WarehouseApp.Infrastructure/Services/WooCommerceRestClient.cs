using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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
            await EnsureSuccessAsync(response, ct);
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
        await EnsureSuccessAsync(response, ct);
    }

    public async Task SetProductStatusAsync(long productId, long? variationId, string status, CancellationToken ct)
    {
        EnsureConfigured();
        var path = variationId is > 0
            ? $"products/{productId}/variations/{variationId.Value}"
            : $"products/{productId}";
        using var request = CreateRequest(HttpMethod.Put, path);
        request.Content = JsonContent.Create(new { status }, options: JsonOptions);
        using var response = await httpClient.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
    }

    public async Task SetOrderStatusAsync(long orderId, string status, CancellationToken ct)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Put, $"orders/{orderId}");
        request.Content = JsonContent.Create(new { status }, options: JsonOptions);
        using var response = await httpClient.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
    }

    public async Task<long> CreateProductAsync(WooCommerceCatalogCreate create, CancellationToken ct)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Post, "products");
        request.Content = JsonContent.Create(create, options: JsonOptions);
        using var response = await httpClient.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        var product = await response.Content.ReadFromJsonAsync<WooCommerceCreatedProduct>(JsonOptions, ct)
            ?? throw new InvalidOperationException("WooCommerce trả về phản hồi sản phẩm rỗng.");
        if (product.Id <= 0) throw new InvalidOperationException("WooCommerce không trả về mã sản phẩm hợp lệ.");
        return product.Id;
    }

    public async Task<long> FindOrCreateCategoryAsync(string name, CancellationToken ct)
    {
        EnsureConfigured();
        var encoded = Uri.EscapeDataString(name);
        using (var search = CreateRequest(HttpMethod.Get, $"products/categories?search={encoded}&per_page=100"))
        using (var response = await httpClient.SendAsync(search, ct))
        {
            await EnsureSuccessAsync(response, ct);
            var categories = await response.Content.ReadFromJsonAsync<List<WooCommerceRemoteCategory>>(JsonOptions, ct) ?? [];
            var exact = categories.FirstOrDefault(x => string.Equals(x.Name.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase));
            if (exact is not null && exact.Id > 0) return exact.Id;
        }

        using var create = CreateRequest(HttpMethod.Post, "products/categories");
        create.Content = JsonContent.Create(new { name = name.Trim() }, options: JsonOptions);
        using var createdResponse = await httpClient.SendAsync(create, ct);
        await EnsureSuccessAsync(createdResponse, ct);
        var created = await createdResponse.Content.ReadFromJsonAsync<WooCommerceRemoteCategory>(JsonOptions, ct)
            ?? throw new InvalidOperationException("WooCommerce không trả về danh mục hợp lệ.");
        if (created.Id <= 0) throw new InvalidOperationException("WooCommerce không trả về mã danh mục hợp lệ.");
        return created.Id;
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

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode) return;

        var body = await response.Content.ReadAsStringAsync(ct);
        if (body.Length > 2000) body = body[..2000];
        throw new WarehouseApp.Core.DomainValidationException(
            $"WooCommerce từ chối yêu cầu (HTTP {(int)response.StatusCode}): {body}");
    }
}

public sealed record WooCommerceRemoteOrder(
    long Id,
    string Number,
    string Status,
    string? Currency,
    [property: JsonConverter(typeof(WooCommerceStringOrNumberConverter))]
    string? Total,
    [property: JsonPropertyName("date_created")]
    DateTimeOffset? DateCreated,
    [property: JsonPropertyName("date_created_gmt")]
    DateTimeOffset? DateCreatedGmt,
    [property: JsonPropertyName("date_modified")]
    DateTimeOffset? DateModified,
    [property: JsonPropertyName("date_modified_gmt")]
    DateTimeOffset? DateModifiedGmt,
    WooCommerceRemoteAddress? Billing,
    WooCommerceRemoteAddress? Shipping,
    [property: JsonPropertyName("line_items")]
    List<WooCommerceRemoteOrderItem>? LineItems);

public sealed record WooCommerceRemoteAddress(
    [property: JsonPropertyName("first_name")]
    string? FirstName,
    [property: JsonPropertyName("last_name")]
    string? LastName,
    [property: JsonPropertyName("address_1")]
    string? Address1,
    [property: JsonPropertyName("address_2")]
    string? Address2,
    string? City,
    string? State,
    [property: JsonPropertyName("postcode")]
    string? Postcode,
    string? Country,
    string? Email,
    string? Phone);

public sealed record WooCommerceRemoteOrderItem(
    long Id,
    [property: JsonPropertyName("product_id")]
    long? ProductId,
    [property: JsonPropertyName("variation_id")]
    long? VariationId,
    string? Name,
    int Quantity,
    [property: JsonConverter(typeof(WooCommerceStringOrNumberConverter))]
    string? Price,
    [property: JsonConverter(typeof(WooCommerceStringOrNumberConverter))]
    string? Subtotal);

/// <summary>WooCommerce may serialize monetary values as either JSON strings or numbers.</summary>
public sealed class WooCommerceStringOrNumberConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.Null => null,
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => reader.GetDecimal().ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => throw new JsonException($"Không thể đọc giá trị WooCommerce dạng {reader.TokenType} như chuỗi hoặc số.")
        };

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value);
}

public sealed record WooCommerceCatalogUpdate(
    string Name,
    string Sku,
    string Description,
    [property: JsonPropertyName("regular_price")] string RegularPrice,
    [property: JsonPropertyName("manage_stock")] bool ManageStock,
    [property: JsonPropertyName("stock_quantity")] int StockQuantity,
    [property: JsonPropertyName("stock_status")] string StockStatus,
    [property: JsonPropertyName("low_stock_amount")] int LowStockAmount,
    IReadOnlyList<WooCommerceImageUpdate>? Images,
    IReadOnlyList<WooCommerceProductCategory> Categories,
    WooCommerceDimensions? Dimensions,
    string Status);

public sealed record WooCommerceCatalogCreate(
    string Name,
    string Sku,
    string Description,
    [property: JsonPropertyName("regular_price")] string RegularPrice,
    [property: JsonPropertyName("manage_stock")] bool ManageStock,
    [property: JsonPropertyName("stock_quantity")] int StockQuantity,
    [property: JsonPropertyName("stock_status")] string StockStatus,
    [property: JsonPropertyName("low_stock_amount")] int LowStockAmount,
    IReadOnlyList<WooCommerceImageUpdate>? Images,
    IReadOnlyList<WooCommerceProductCategory>? Categories,
    WooCommerceDimensions? Dimensions);

public sealed record WooCommerceImageUpdate(string Src);
public sealed record WooCommerceProductCategory(long Id);
public sealed record WooCommerceDimensions(string Length, string Width, string Height);
public sealed record WooCommerceCreatedProduct(long Id);
public sealed record WooCommerceRemoteCategory(long Id, string Name);
