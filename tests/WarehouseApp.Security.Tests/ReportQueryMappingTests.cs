using System.Reflection;
using WarehouseApp.Infrastructure.Reports;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class ReportQueryMappingTests
{
    [Theory]
    [InlineData("SalesSummaryDbRow")]
    [InlineData("InventoryFlowDbRow")]
    public void PostgreSqlDateProjection_MapsToDateOnly(string rowTypeName)
    {
        var rowType = typeof(DapperReportQueries).GetNestedType(rowTypeName, BindingFlags.NonPublic);

        Assert.NotNull(rowType);
        Assert.Equal(typeof(DateOnly), rowType.GetProperty("Date")?.PropertyType);
    }
}
