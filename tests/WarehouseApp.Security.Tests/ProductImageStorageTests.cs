using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using WarehouseApp.Api.Services;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class ProductImageStorageTests
{
    [Fact]
    public async Task SaveAsWebpAsync_ValidPng_ConvertsToManagedWebp()
    {
        var root = Path.Combine(Path.GetTempPath(), "WarehouseApp-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);

        try
        {
            var environment = new TestWebHostEnvironment { ContentRootPath = root };
            var storage = new ProductImageStorage(environment);
            var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
            await using var stream = new MemoryStream(png);
            var file = new FormFile(stream, 0, png.Length, "file", "sample.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png",
            };

            var imageUrl = await storage.SaveAsWebpAsync(file, CancellationToken.None);

            Assert.StartsWith("/uploads/products/", imageUrl, StringComparison.Ordinal);
            Assert.EndsWith(".webp", imageUrl, StringComparison.OrdinalIgnoreCase);

            var fileName = Path.GetFileName(imageUrl);
            var savedPath = Path.Combine(ProductImageStorage.GetUploadDirectory(environment), fileName);
            Assert.True(File.Exists(savedPath));
            Assert.Equal("RIFF", System.Text.Encoding.ASCII.GetString(await File.ReadAllBytesAsync(savedPath), 0, 4));
            Assert.Equal("WEBP", System.Text.Encoding.ASCII.GetString(await File.ReadAllBytesAsync(savedPath), 8, 4));
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void EnsureUploadDirectory_CreatesStaticFileRootBeforeAnyUpload()
    {
        var root = Path.Combine(Path.GetTempPath(), "WarehouseApp-tests", Guid.NewGuid().ToString("N"));

        try
        {
            var environment = new TestWebHostEnvironment { ContentRootPath = root };

            var directory = ProductImageStorage.EnsureUploadDirectory(environment);

            Assert.True(Directory.Exists(directory));
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "WarehouseApp.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
