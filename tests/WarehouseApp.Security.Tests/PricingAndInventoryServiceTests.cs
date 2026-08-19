using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using WarehouseApp.Core;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Infrastructure.Data;
using WarehouseApp.Infrastructure.Services;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class PricingAndInventoryServiceTests
{
    [Fact]
    public async Task UpdatingRateCardRepricesEveryProductComponent()
    {
        await using var db = CreateDb();
        db.Products.Add(new WarehouseApp.Core.Entities.Product
        {
            Id = 1, Sku = "P-001", Name = "Product", BasePrice = 0, InStock = 10, WarningStock = 1,
        });
        db.ProductComponents.Add(new WarehouseApp.Core.Entities.ProductComponent
        {
            ProductId = 1, Wage = 10, ValKieng = 2, ValNhL = 3,
        });
        await db.SaveChangesAsync();

        var service = new PricingService(db);
        await service.UpdateRateCardAsync(new UpdateRateCardRequest(
            5, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));

        var product = await db.Products.SingleAsync();
        Assert.Equal(41m, product.BasePrice);
    }

    [Fact]
    public async Task AdjustStockRejectsNegativeResult()
    {
        await using var db = CreateDb();
        db.Products.Add(new WarehouseApp.Core.Entities.Product
        {
            Id = 1, Sku = "P-001", Name = "Product", BasePrice = 10, InStock = 2, WarningStock = 1,
        });
        await db.SaveChangesAsync();

        var service = new InventoryService(db);

        var error = await Assert.ThrowsAsync<DomainValidationException>(() =>
            service.AdjustStockAsync(1, new StockAdjustmentRequest(-3, "test")));

        Assert.Contains("tồn kho", error.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(2, (await db.Products.SingleAsync()).InStock);
    }

    [Fact]
    public async Task UpsertingAllPricingComponentsComputesTheCompleteBasePrice()
    {
        await using var db = CreateDb();
        db.Products.Add(new WarehouseApp.Core.Entities.Product
        {
            Id = 2, Sku = "P-002", Name = "Complete pricing product", BasePrice = 0,
            InStock = 1, WarningStock = 1,
        });
        db.SubPrices.Add(new WarehouseApp.Core.Entities.SubPrice
        {
            Id = 1,
            PrKieng = 1, PrNhL = 2, PrNhN = 3, PrGL = 4, PrGN = 5,
            PrDL = 6, PrBack = 7, PrLua = 8, PrKT = 9, PrOc = 10,
            PrNhom = 11, Pr7F = 12, Pr2D = 13, PrDecal = 14,
        });
        await db.SaveChangesAsync();

        var service = new PricingService(db);
        var result = await service.UpsertComponentsAsync(2, new UpsertProductComponentRequest(
            Wage: 100,
            ValKieng: 1, ValNhL: 1, ValNhN: 1, ValGL: 1, ValGN: 1,
            ValDL: 1, ValBack: 1, ValLua: 1, ValKT: 1, ValOc: 1,
            ValNhom: 1, Val7F: 1, Val2D: 1, ValDecal: 1));

        Assert.NotNull(result);
        Assert.Equal(205m, result!.BasePrice);
        Assert.Equal(205m, (await db.Products.SingleAsync(p => p.Id == 2)).BasePrice);
    }

    [Fact]
    public async Task InvoiceValidationRejectsEmptyLinesBeforeDatabaseMutation()
    {
        await using var db = CreateDb();
        var service = new InvoiceService(db);

        await Assert.ThrowsAsync<DomainValidationException>(() =>
            service.CreateAsync(new CreateInvoiceRequest(1, Array.Empty<CreateInvoiceLineRequest>()), CancellationToken.None));

        Assert.Empty(await db.Invoices.ToListAsync());
    }

    private static AppDbContext CreateDb() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase($"service-tests-{Guid.NewGuid():N}")
        .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
        .Options);
}
