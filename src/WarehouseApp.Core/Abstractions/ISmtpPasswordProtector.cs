namespace WarehouseApp.Core.Abstractions;

/// <summary>
/// Protects the reversible SMTP credential before persistence. This must use authenticated
/// encryption rather than a password hash because an SMTP client needs the original value.
/// </summary>
public interface ISmtpPasswordProtector
{
    string Protect(string password);
    string Unprotect(string protectedPassword);
}
