using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace WarehouseApp.Api.Security;

public static class JwtSigningKeyStore
{
    private const int KeySize = 32;
    private const byte DpapiPayload = 1;
    private const byte PlainPayload = 0;

    public static byte[] Resolve(IConfiguration config)
    {
        var configured = config["Authentication:SigningKey"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Validate(Encoding.UTF8.GetBytes(configured));

        var root = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(root))
            root = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        if (string.IsNullOrWhiteSpace(root))
            throw new InvalidOperationException("Không xác định được thư mục dữ liệu người dùng để lưu JWT signing key.");

        var directory = Path.Combine(root, "WarehouseApp", "security");
        var path = Path.Combine(directory, "jwt-signing-key.bin");
        Directory.CreateDirectory(directory);

        if (File.Exists(path))
            return Read(path);

        var key = RandomNumberGenerator.GetBytes(KeySize);
        var payload = Protect(key);

        try
        {
            using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            stream.Write(payload);
        }
        catch (IOException) when (File.Exists(path))
        {
            return Read(path);
        }

        if (!OperatingSystem.IsWindows())
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);

        return key;
    }

    private static byte[] Read(string path)
    {
        var payload = File.ReadAllBytes(path);
        if (payload.Length < 2)
            throw new InvalidOperationException("JWT signing key đã lưu không hợp lệ.");

        var key = payload[0] switch
        {
            DpapiPayload when OperatingSystem.IsWindows() =>
                ProtectedData.Unprotect(payload[1..], null, DataProtectionScope.CurrentUser),
            PlainPayload when !OperatingSystem.IsWindows() => payload[1..],
            _ => throw new InvalidOperationException("JWT signing key không tương thích với hệ điều hành hiện tại."),
        };

        return Validate(key);
    }

    private static byte[] Protect(byte[] key)
    {
        var protectedKey = OperatingSystem.IsWindows()
            ? ProtectedData.Protect(key, null, DataProtectionScope.CurrentUser)
            : key;
        var marker = OperatingSystem.IsWindows() ? DpapiPayload : PlainPayload;
        return [marker, .. protectedKey];
    }

    private static byte[] Validate(byte[] key)
    {
        if (key.Length < KeySize)
            throw new InvalidOperationException("Authentication:SigningKey phải có ít nhất 32 bytes.");
        return key;
    }
}
