using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using WarehouseApp.Api.Services;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class ProductImageStorageTests
{
    [Fact]
    public async Task SaveAsJpegAsync_ValidPng_UploadsJpegToProductImagesBucket()
    {
        var handler = new RecordingHandler(HttpStatusCode.OK);
        var storage = CreateStorage(handler);
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        await using var stream = new MemoryStream(png);
        var file = new FormFile(stream, 0, png.Length, "file", "sample.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png",
        };

        var imageUrl = await storage.SaveAsJpegAsync(42, file, CancellationToken.None);

        Assert.StartsWith("https://example.supabase.co/storage/v1/object/public/product-images/products/42/", imageUrl, StringComparison.Ordinal);
        Assert.EndsWith(".jpg", imageUrl, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpMethod.Post, handler.Method);
        Assert.Equal("image/jpeg", handler.ContentType);
        Assert.Equal("Bearer server-secret", handler.Authorization);
        Assert.Equal(0xFF, handler.Payload[0]);
        Assert.Equal(0xD8, handler.Payload[1]);
    }

    [Fact]
    public async Task DeleteAsync_ManagedPublicUrl_DeletesStorageObject()
    {
        var handler = new RecordingHandler(HttpStatusCode.OK);
        var storage = CreateStorage(handler);

        await storage.DeleteAsync(
            "https://example.supabase.co/storage/v1/object/public/product-images/products/42/image.webp",
            CancellationToken.None);

        Assert.Equal(HttpMethod.Delete, handler.Method);
        Assert.Equal("https://example.supabase.co/storage/v1/object/product-images/products/42/image.webp", handler.Uri);
    }

    private static ProductImageStorage CreateStorage(RecordingHandler handler) =>
        new(new HttpClient(handler), Options.Create(new SupabaseStorageOptions
        {
            Url = "https://example.supabase.co",
            ServiceRoleKey = "server-secret",
            Bucket = "product-images",
        }));

    private sealed class RecordingHandler(HttpStatusCode statusCode) : HttpMessageHandler
    {
        public HttpMethod? Method { get; private set; }
        public string? Uri { get; private set; }
        public string? ContentType { get; private set; }
        public string? Authorization { get; private set; }
        public byte[] Payload { get; private set; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Method = request.Method;
            Uri = request.RequestUri?.ToString();
            ContentType = request.Content?.Headers.ContentType?.MediaType;
            Authorization = request.Headers.Authorization?.ToString();
            Payload = request.Content is null ? [] : await request.Content.ReadAsByteArrayAsync(cancellationToken);
            return new HttpResponseMessage(statusCode);
        }
    }
}
