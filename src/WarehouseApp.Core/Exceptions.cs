namespace WarehouseApp.Core;

/// <summary>Requested entity does not exist. Surfaces as HTTP 404.</summary>
public sealed class NotFoundException(string message) : Exception(message);

/// <summary>Business rule violated (bad SKU, insufficient stock, ...). Surfaces as HTTP 400.</summary>
public sealed class DomainValidationException(string message) : Exception(message);

/// <summary>Centralized business-validation errors shared by every stock workflow.</summary>
public static class DomainErrors
{
    public const string InsufficientStockMessage =
        "Số lượng xuất kho không hợp lệ vì nhiều hơn tồn kho đang có";

    public static DomainValidationException InsufficientStock() =>
        new(InsufficientStockMessage);
}

/// <summary>Optimistic-concurrency conflict from a competing station. Surfaces as HTTP 409.</summary>
public sealed class ConcurrencyConflictException(string message) : Exception(message);
