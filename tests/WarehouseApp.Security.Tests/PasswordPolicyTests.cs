using WarehouseApp.Core.Security;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class PasswordPolicyTests
{
    [Fact]
    public void Validate_AcceptsStrongPassword()
    {
        Assert.Null(PasswordPolicy.Validate("KhoHang2026!", "nhanvien"));
    }

    [Theory]
    [InlineData("Short1", "ít nhất")]
    [InlineData("alllowercase1", "chữ hoa")]
    [InlineData("ALLUPPERCASE1", "chữ thường")]
    [InlineData("NoDigitsHere!", "chữ số")]
    [InlineData("Admin123", "ít nhất")]
    public void Validate_RejectsWeakPassword(string password, string expectedMessage)
    {
        var error = PasswordPolicy.Validate(password, "nhanvien");

        Assert.NotNull(error);
        Assert.Contains(expectedMessage, error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_RejectsPasswordContainingUsername()
    {
        var error = PasswordPolicy.Validate("ThuanNg052026!", "ThuanNg05");

        Assert.NotNull(error);
        Assert.Contains("tên đăng nhập", error, StringComparison.OrdinalIgnoreCase);
    }
}
