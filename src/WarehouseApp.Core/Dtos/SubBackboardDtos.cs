namespace WarehouseApp.Core.Dtos;

public record SubBackboardDto(
    long Id,
    string Size,
    int InStock,
    int WarningStock,
    short Status,
    string? Description,
    DateTimeOffset UpdatedAt);

public record CreateSubBackboardRequest(
    string Size,
    int InStock,
    int WarningStock,
    string? Description);

// Stock is managed via inventory transactions, so it is not editable here.
public record UpdateSubBackboardRequest(
    string Size,
    int WarningStock,
    short Status,
    string? Description);
