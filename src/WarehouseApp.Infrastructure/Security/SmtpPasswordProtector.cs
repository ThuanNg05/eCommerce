using System.Security.Cryptography;
using System.Text;
using WarehouseApp.Core.Abstractions;

namespace WarehouseApp.Infrastructure.Security;

/// <summary>Encrypts SMTP credentials with AES-256-GCM using a key held outside the database.</summary>
public sealed class SmtpPasswordProtector(string? encodedKey) : ISmtpPasswordProtector
{
    public const string ConfigurationKey = "SmtpPasswordEncryption:Key";
    private const string Prefix = "smtp:v1:";
    private const int KeySize = 32;
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private static readonly byte[] AssociatedData = Encoding.UTF8.GetBytes("WarehouseApp:SmtpPassword:v1");

    public string Protect(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var key = ResolveKey();
        var plaintext = Encoding.UTF8.GetBytes(password);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var tag = new byte[TagSize];
        var ciphertext = new byte[plaintext.Length];

        try
        {
            using var aes = new AesGcm(key, TagSize);
            aes.Encrypt(nonce, plaintext, ciphertext, tag, AssociatedData);

            var payload = new byte[NonceSize + TagSize + ciphertext.Length];
            nonce.CopyTo(payload, 0);
            tag.CopyTo(payload, NonceSize);
            ciphertext.CopyTo(payload, NonceSize + TagSize);
            return Prefix + Convert.ToBase64String(payload);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    public string Unprotect(string protectedPassword)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(protectedPassword);
        if (!protectedPassword.StartsWith(Prefix, StringComparison.Ordinal))
            throw new CryptographicException("SMTP password không có định dạng mã hóa được hỗ trợ.");

        byte[] payload;
        try
        {
            payload = Convert.FromBase64String(protectedPassword[Prefix.Length..]);
        }
        catch (FormatException ex)
        {
            throw new CryptographicException("SMTP password có payload không hợp lệ.", ex);
        }

        if (payload.Length <= NonceSize + TagSize)
            throw new CryptographicException("SMTP password có payload không hợp lệ.");

        var key = ResolveKey();
        var nonce = payload.AsSpan(0, NonceSize);
        var tag = payload.AsSpan(NonceSize, TagSize);
        var ciphertext = payload.AsSpan(NonceSize + TagSize);
        var plaintext = new byte[ciphertext.Length];

        try
        {
            using var aes = new AesGcm(key, TagSize);
            aes.Decrypt(nonce, ciphertext, tag, plaintext, AssociatedData);
            return Encoding.UTF8.GetString(plaintext);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
            CryptographicOperations.ZeroMemory(payload);
        }
    }

    private byte[] ResolveKey()
    {
        if (string.IsNullOrWhiteSpace(encodedKey))
        {
            throw new InvalidOperationException(
                $"Thiếu khóa mã hóa '{ConfigurationKey}'. Hãy cấu hình bằng User Secrets " +
                "hoặc biến môi trường SmtpPasswordEncryption__Key.");
        }

        byte[] key;
        try
        {
            key = Convert.FromBase64String(encodedKey);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException(
                $"Khóa '{ConfigurationKey}' phải là Base64 của đúng 32 bytes.", ex);
        }

        if (key.Length == KeySize)
            return key;

        CryptographicOperations.ZeroMemory(key);
        throw new InvalidOperationException(
            $"Khóa '{ConfigurationKey}' phải giải mã thành đúng {KeySize} bytes.");
    }
}
