using System.Net.Http;
using Microsoft.Extensions.Options;
using WarehouseApp.Infrastructure.Services;
using Xunit;

namespace WarehouseApp.Security.Tests;

public sealed class WooCommerceRestClientTests
{
    [Fact]
    public void ParseCategory_maps_woocommerce_category_payload()
    {
        const string payload = """
        {
          "id": 51,
          "name": "Khung gỗ"
        }
        """;

        var client = new WooCommerceRestClient(
            new HttpClient(),
            Options.Create(new WooCommerceOptions()));

        var category = client.ParseCategory(System.Text.Encoding.UTF8.GetBytes(payload));

        Assert.Equal(51, category.Id);
        Assert.Equal("Khung gỗ", category.Name);
    }

    [Fact]
    public void ParseCategoryId_maps_taxonomy_action_webhook_payload()
    {
        var client = new WooCommerceRestClient(
            new HttpClient(),
            Options.Create(new WooCommerceOptions()));

        var categoryId = client.ParseCategoryId(System.Text.Encoding.UTF8.GetBytes("51"));

        Assert.Equal(51, categoryId);
    }

    [Fact]
    public void ParseOrder_maps_woocommerce_snake_case_order_fields()
    {
        const string payload = """
        {
          "id": 8210,
          "number": "8210",
          "status": "processing",
          "currency": "VND",
          "total": "1000000.00",
          "date_created": "2026-08-17T15:16:00+07:00",
          "date_created_gmt": "2026-08-17T03:15:00Z",
          "date_modified": "2026-08-17T15:20:00+07:00",
          "date_modified_gmt": "2026-08-17T03:20:00Z",
          "billing": {
            "first_name": "Thuan",
            "last_name": "Nguyen",
            "email": "thuan@example.com",
            "phone": "0900000000"
          },
          "shipping": {
            "first_name": "Thuan",
            "last_name": "Nguyen",
            "address_1": "123 Nguyen Hue",
            "address_2": "Tang 2",
            "city": "Quan 1",
            "state": "Ho Chi Minh",
            "postcode": "700000",
            "country": "VN"
          },
          "line_items": [
            {
              "id": 99,
              "product_id": 123,
              "variation_id": 456,
              "name": "Khung tranh",
              "quantity": 2,
              "price": 500000,
              "subtotal": 1000000
            }
          ]
        }
        """;

        var client = new WooCommerceRestClient(
            new HttpClient(),
            Options.Create(new WooCommerceOptions()));

        var order = client.ParseOrder(System.Text.Encoding.UTF8.GetBytes(payload));

        Assert.Equal(new DateTimeOffset(2026, 8, 17, 15, 16, 0, TimeSpan.FromHours(7)), order.DateCreated);
        Assert.Equal(new DateTimeOffset(2026, 8, 17, 3, 15, 0, TimeSpan.Zero), order.DateCreatedGmt);
        Assert.Equal(new DateTimeOffset(2026, 8, 17, 15, 20, 0, TimeSpan.FromHours(7)), order.DateModified);
        Assert.Equal(new DateTimeOffset(2026, 8, 17, 3, 20, 0, TimeSpan.Zero), order.DateModifiedGmt);
        Assert.Equal("123 Nguyen Hue", order.Shipping!.Address1);
        Assert.Equal("Tang 2", order.Shipping.Address2);
        Assert.Equal("700000", order.Shipping.Postcode);
        Assert.Equal("Thuan", order.Billing!.FirstName);
        Assert.Equal("Nguyen", order.Billing.LastName);
        var item = Assert.Single(order.LineItems!);
        Assert.Equal(123, item.ProductId);
        Assert.Equal(456, item.VariationId);
      }
}
