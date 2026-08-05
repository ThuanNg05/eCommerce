namespace WarehouseApp.Core.Dtos;

public record CustomerDto(
    long Id,
    string Name,
    string Phone,
    string? Address,
    string? Email,
    string? GroupPrice,
    string? Description,
    DateTimeOffset UpdatedAt);

public record CreateCustomerRequest(
    string Name,
    string Phone,
    string? Address,
    string? Email,
    string? GroupPrice,
    string? Description);

public record UpdateCustomerRequest(
    string Name,
    string Phone,
    string? Address,
    string? Email,
    string? GroupPrice,
    string? Description);
