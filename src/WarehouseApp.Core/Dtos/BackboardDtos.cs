namespace WarehouseApp.Core.Dtos;

public record BackboardDto(
    long Id,
    short Type,
    decimal ImportPrice,
    decimal? SalePrice,
    int InStock,
    int WarningStock,
    short Status,
    string? Description,
    DateTimeOffset UpdatedAt);

public record CreateBackboardRequest(
    short Type,
    decimal ImportPrice,
    decimal? SalePrice,
    int InStock,
    int WarningStock,
    string? Description);

// Stock is managed via inventory transactions, so it is not editable here.
public record UpdateBackboardRequest(
    short Type,
    decimal ImportPrice,
    decimal? SalePrice,
    int WarningStock,
    short Status,
    string? Description);
