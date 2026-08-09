using System.Text;

namespace WarehouseApp.Core.Security;

public static class PasswordPolicy
{
    public const int MinimumLength = 10;
    public const int MaximumUtf8Bytes = 72;

    private static readonly HashSet<string> CommonPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "password123",
        "admin123",
        "changeme123",
        "1234567890",
        "qwerty123",
    };

    public static string? Validate(string? password, string? username = null)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumLength)
            return $"Mật khẩu phải có ít nhất {MinimumLength} ký tự.";

        if (Encoding.UTF8.GetByteCount(password) > MaximumUtf8Bytes)
            return $"Mật khẩu không được vượt quá {MaximumUtf8Bytes} byte UTF-8.";

        if (!password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit))
            return "Mật khẩu phải có chữ hoa, chữ thường và chữ số.";

        if (CommonPasswords.Contains(password))
            return "Mật khẩu quá phổ biến. Vui lòng chọn mật khẩu khác.";

        if (!string.IsNullOrWhiteSpace(username) &&
            password.Contains(username.Trim(), StringComparison.OrdinalIgnoreCase))
            return "Mật khẩu không được chứa tên đăng nhập.";

        return null;
    }

    public static void EnsureValid(string? password, string? username = null)
    {
        if (Validate(password, username) is { } error)
            throw new DomainValidationException(error);
    }
}
