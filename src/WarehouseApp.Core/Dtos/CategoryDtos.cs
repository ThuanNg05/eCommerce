namespace WarehouseApp.Core.Dtos;

public record CategoryDto(
    long Id,
    string Name,
    DateTimeOffset CreatedAt);

public record CreateCategoryRequest(string Name);

public record UpdateCategoryRequest(string Name);
