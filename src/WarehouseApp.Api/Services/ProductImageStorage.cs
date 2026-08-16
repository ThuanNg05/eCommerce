using ImageMagick;
using WarehouseApp.Core;

namespace WarehouseApp.Api.Services;

/// <summary>Validates and converts product image uploads to application-managed WebP files.</summary>
public sealed class ProductImageStorage(IWebHostEnvironment environment)
{
    public const string PublicPathPrefix = "/uploads/products";
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

    private readonly string _uploadDirectory = GetUploadDirectory(environment);

    public static string GetUploadDirectory(IWebHostEnvironment environment) =>
        Path.Combine(environment.ContentRootPath, "uploads", "products");

    /// <summary>Ensures the static-file provider's root exists before API startup.</summary>
    public static string EnsureUploadDirectory(IWebHostEnvironment environment)
    {
        var directory = GetUploadDirectory(environment);
        Directory.CreateDirectory(directory);
        return directory;
    }

    public async Task<string> SaveAsWebpAsync(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw new DomainValidationException("Vui lòng chọn một file ảnh.");
        if (file.Length > MaxUploadBytes)
            throw new DomainValidationException("Ảnh không được vượt quá 5 MB.");

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
            image.Format = MagickFormat.WebP;
            image.Quality = 82;

            Directory.CreateDirectory(_uploadDirectory);
            var fileName = $"{Guid.NewGuid():N}.webp";
            var outputPath = Path.Combine(_uploadDirectory, fileName);
            image.Write(outputPath);

            return $"{PublicPathPrefix}/{fileName}";
        }
        catch (DomainValidationException)
        {
            throw;
        }
        catch (MagickException)
        {
            throw new DomainValidationException("File tải lên không phải ảnh hợp lệ hoặc không thể chuyển đổi sang WebP.");
        }
    }

    public Task DeleteAsync(string? imageUrl)
    {
        if (!TryGetManagedFileName(imageUrl, out var fileName))
            return Task.CompletedTask;

        var path = Path.Combine(_uploadDirectory, fileName);
        if (File.Exists(path))
            File.Delete(path);

        return Task.CompletedTask;
    }

    private static bool TryGetManagedFileName(string? imageUrl, out string fileName)
    {
        fileName = string.Empty;
        if (string.IsNullOrWhiteSpace(imageUrl) || !imageUrl.StartsWith($"{PublicPathPrefix}/", StringComparison.Ordinal))
            return false;

        var candidate = imageUrl[($"{PublicPathPrefix}/").Length..];
        if (!candidate.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ||
            candidate.Contains('/') || candidate.Contains('\\') || Path.GetFileName(candidate) != candidate)
            return false;

        fileName = candidate;
        return true;
    }
}
