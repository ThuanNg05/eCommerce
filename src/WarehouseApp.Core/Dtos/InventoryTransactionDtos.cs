namespace WarehouseApp.Core.Dtos;

/// <summary>One movement line. Exactly one item foreign key is set; <see cref="Direction"/>
/// is 1 (In, +stock) or 2 (Out, −stock).</summary>
public record TransactionLineDto(
    long? ProductId,
    long? BackboardId,
    long? MaterialId,
    long? FrameId,
    long? SubBackboardId,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    short Direction);

public record InventoryTransactionDto(
    long Id,
    int TransactionCode,
    short Type,
    DateOnly TransactionDate,
    string? Note,
    DateTimeOffset CreatedAt,
    IReadOnlyList<TransactionLineDto> Details);

/// <summary>A requested movement line. <c>TotalPrice</c> is not accepted from the client —
/// the server computes it as <c>UnitPrice * Quantity</c>.</summary>
public record CreateTransactionLineRequest(
    long? ProductId,
    long? BackboardId,
    long? MaterialId,
    long? FrameId,
    long? SubBackboardId,
    int Quantity,
    decimal UnitPrice,
    short Direction);

/// <summary><see cref="Type"/> is 1 (Nhập/receipt) or 2 (Xuất/issue); the code and date
/// are assigned by the server.</summary>
public record CreateInventoryTransactionRequest(
    short Type,
    string? Note,
    IReadOnlyList<CreateTransactionLineRequest> Details);
