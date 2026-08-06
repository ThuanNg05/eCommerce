namespace WarehouseApp.Core.Dtos;

public record MaterialDto(
    long Id,
    string Name,
    decimal ImportPrice,
    decimal SalePrice,
    int InStock,
    int WarningStock,
    short Status,
    string? Description,
    DateTimeOffset UpdatedAt);

public record CreateMaterialRequest(
    string Name,
    decimal ImportPrice,
    decimal SalePrice,
    int InStock,
    int WarningStock,
    string? Description);

// Stock is managed via inventory transactions, so it is not editable here.
public record UpdateMaterialRequest(
    string Name,
    decimal ImportPrice,
    decimal SalePrice,
    int WarningStock,
    short Status,
    string? Description);
