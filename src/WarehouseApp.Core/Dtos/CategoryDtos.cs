namespace WarehouseApp.Core.Dtos;

public record CategoryDto(
    long Id,
    string Name,
    bool IsActive,
    DateTimeOffset CreatedAt,
    WooCommerceCategoryLinkDto? WooCommerceLink = null);

/// <summary>Set <c>SyncToWooCommerce</c> when the new category must be linked immediately.</summary>
public record CreateCategoryRequest(string Name, bool SyncToWooCommerce = false);

public record UpdateCategoryRequest(string Name);

public record UpdateCategoryStatusRequest(bool IsActive);
