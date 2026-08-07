namespace WarehouseApp.Core;

/// <summary>
/// Vietnam's business-calendar clock. Persisted <c>timestamptz</c> values remain UTC;
/// this helper is only for date-only business concepts such as slip dates, invoice
/// prefixes, and default report ranges.
/// </summary>
public static class VietnamBusinessTime
{
    private static readonly TimeZoneInfo Zone = FindZone();

    public static DateOnly Today => DateOnly.FromDateTime(
        TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Zone).DateTime);

    private static TimeZoneInfo FindZone()
    {
        try
        {
            // IANA identifier: supported by .NET on Linux and modern Windows.
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
        }
        catch (TimeZoneNotFoundException)
        {
            // Windows fallback for environments without IANA-to-Windows mapping.
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
    }
}
