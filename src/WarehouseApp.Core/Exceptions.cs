namespace WarehouseApp.Core;

/// <summary>Requested entity does not exist. Surfaces as HTTP 404.</summary>
public sealed class NotFoundException(string message) : Exception(message);

/// <summary>Business rule violated (bad SKU, insufficient stock, ...). Surfaces as HTTP 400.</summary>
public sealed class DomainValidationException(string message) : Exception(message);

/// <summary>Optimistic-concurrency conflict from a competing station. Surfaces as HTTP 409.</summary>
public sealed class ConcurrencyConflictException(string message) : Exception(message);
