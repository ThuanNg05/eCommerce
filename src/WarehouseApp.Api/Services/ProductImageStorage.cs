using System.Net.Http.Headers;
using ImageMagick;
using Microsoft.Extensions.Options;
using WarehouseApp.Core;

namespace WarehouseApp.Api.Services;

public sealed class SupabaseStorageOptions
{
    public const string SectionName = "SupabaseStorage";

    public string Url { get; set; } = string.Empty;
    public string ServiceRoleKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = "product-images";
}

/// <summary>Converts product uploads to JPEG and persists them in Supabase Storage.
/// JPEG is accepted by the WordPress media security policy used by WooCommerce.</summary>
public sealed class ProductImageStorage(HttpClient httpClient, IOptions<SupabaseStorageOptions> options)
{
    private const long MaxUploadBytes = 5 * 1024 * 1024;
    private const ulong MaxPixels = 20_000_000;
    private const uint MaxDimension = 2048;

    private static readonly HashSet<MagickFormat> AllowedFormats =
    [
        MagickFormat.Jpeg,
        MagickFormat.Png,
        MagickFormat.Gif,
        MagickFormat.Bmp,
        MagickFormat.Tiff,
        MagickFormat.WebP,
        MagickFormat.Svg,
    ];

    public async Task<string> SaveAsJpegAsync(long productId, IFormFile file, CancellationToken ct)
    {
        if (productId <= 0)
            throw new DomainValidationException("Mã sản phẩm không hợp lệ.");
        if (file is null || file.Length == 0)
            throw new DomainValidationException("Vui lòng chọn một file ảnh.");
        if (file.Length > MaxUploadBytes)
            throw new DomainValidationException("Ảnh không được vượt quá 5 MB.");

        byte[] jpeg;
        try
        {
            await using var input = file.OpenReadStream();
            var info = new MagickImageInfo(input);
            if (!AllowedFormats.Contains(info.Format))
                throw new DomainValidationException("Chỉ chấp nhận ảnh JPG, PNG, GIF, BMP, TIFF, SVG hoặc WebP.");
            if (info.Width == 0 || info.Height == 0 || (ulong)info.Width * info.Height > MaxPixels)
                throw new DomainValidationException("Kích thước ảnh không hợp lệ hoặc vượt quá giới hạn 20 megapixel.");

            await using var imageInput = file.OpenReadStream();
            using var image = new MagickImage(imageInput);
            image.AutoOrient();
            image.Strip();
            image.Resize(new MagickGeometry(MaxDimension, MaxDimension) { Greater = true });
            image.Format = MagickFormat.Jpeg;
            image.Quality = 88;
            await using var output = new MemoryStream();
            image.Write(output);
            jpeg = output.ToArray();
        }
        catch (DomainValidationException)
        {
            throw;
        }
        catch (MagickException)
        {
            throw new DomainValidationException("File tải lên không phải ảnh hợp lệ hoặc không thể chuyển đổi sang JPEG.");
        }

        var config = GetConfiguration();
        var objectPath = $"products/{productId}/{Guid.NewGuid():N}.jpg";
        using var request = CreateRequest(HttpMethod.Post, config, $"storage/v1/object/{config.Bucket}/{objectPath}");
        request.Headers.TryAddWithoutValidation("x-upsert", "false");
        request.Headers.CacheControl = new CacheControlHeaderValue { Public = true, MaxAge = TimeSpan.FromDays(365) };
        request.Content = new ByteArrayContent(jpeg);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");

        using var response = await httpClient.SendAsync(request, ct);
        EnsureSuccess(response, "tải ảnh lên Supabase Storage");
        return BuildPublicUrl(config, objectPath);
    }

    public async Task DeleteAsync(string? imageUrl, CancellationToken ct)
    {
        var config = GetConfiguration();
        if (!TryGetManagedObjectPath(config, imageUrl, out var objectPath))
            return;

        using var request = CreateRequest(HttpMethod.Delete, config, $"storage/v1/object/{config.Bucket}/{objectPath}");
        using var response = await httpClient.SendAsync(request, ct);
        EnsureSuccess(response, "xóa ảnh trên Supabase Storage");
    }

    private static void EnsureSuccess(HttpResponseMessage response, string action)
    {
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Không thể {action} (HTTP {(int)response.StatusCode}).");
    }

    private static HttpRequestMessage CreateRequest(HttpMethod method, SupabaseStorageOptions config, string path)
    {
        var request = new HttpRequestMessage(method, new Uri(new Uri(config.Url.TrimEnd('/') + "/"), path));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ServiceRoleKey);
        request.Headers.Add("apikey", config.ServiceRoleKey);
        return request;
    }

    private SupabaseStorageOptions GetConfiguration()
    {
        var config = options.Value;
        if (!Uri.TryCreate(config.Url, UriKind.Absolute, out _) || string.IsNullOrWhiteSpace(config.ServiceRoleKey))
            throw new InvalidOperationException("SupabaseStorage chưa được cấu hình trên máy chủ.");
        if (string.IsNullOrWhiteSpace(config.Bucket))
            throw new InvalidOperationException("SupabaseStorage:Bucket chưa được cấu hình.");
        return config;
    }

    private static string BuildPublicUrl(SupabaseStorageOptions config, string objectPath) =>
        $"{config.Url.TrimEnd('/')}/storage/v1/object/public/{config.Bucket}/{objectPath}";

    private static bool TryGetManagedObjectPath(SupabaseStorageOptions config, string? imageUrl, out string objectPath)
    {
        objectPath = string.Empty;
        if (string.IsNullOrWhiteSpace(imageUrl)) return false;

        var publicPrefix = $"{config.Url.TrimEnd('/')}/storage/v1/object/public/{config.Bucket}/";
        if (!imageUrl.StartsWith(publicPrefix, StringComparison.Ordinal)) return false;

        var candidate = imageUrl[publicPrefix.Length..];
        if (!candidate.StartsWith("products/", StringComparison.Ordinal) || candidate.Contains("..", StringComparison.Ordinal))
            return false;

        objectPath = candidate;
        return true;
    }
}
