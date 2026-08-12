using Dapper;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Reports;

/// <summary>Read-only aggregation queries for the statistics screen.</summary>
public class DapperReportQueries(IDbConnectionFactory factory) : IReportQueries
{
    private const string VietnamZone = "Asia/Ho_Chi_Minh";

    public async Task<IReadOnlyList<LowStockItemDto>> GetLowStockAsync(CancellationToken ct = default)
    {
        const string sql = """
            select id as product_id, sku, name, in_stock, warning_stock
            from product
            where status = 1 and in_stock <= warning_stock
            order by (warning_stock - in_stock) desc, sku asc;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<LowStockItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<SalesOverviewDto> GetSalesOverviewAsync(SalesReportFilter filter, CancellationToken ct = default)
    {
        var parameters = CreateSalesParameters(filter);
        var sql = $"""
            select coalesce(sum(d.subtotal), 0) as revenue,
                   count(distinct i.id)        as invoice_count,
                   coalesce(sum(d.quantity), 0) as units_sold,
                   coalesce(sum(d.subtotal) / nullif(count(distinct i.id), 0), 0) as average_invoice_value
            from invoice i
            join customer c on c.id = i.customer_id
            join invoice_detail d on d.invoice_id = i.id
            join product p on p.id = d.product_id
            {SalesWhere(filter, parameters)};
            """;

        using var conn = factory.Create();
        var row = await conn.QuerySingleAsync<SalesOverviewDbRow>(new CommandDefinition(sql, parameters, cancellationToken: ct));
        return new SalesOverviewDto(row.Revenue, checked((int)row.InvoiceCount), checked((int)row.UnitsSold), row.AverageInvoiceValue);
    }

    public async Task<IReadOnlyList<SalesSummaryRowDto>> GetSalesSummaryAsync(SalesReportFilter filter, string groupBy, CancellationToken ct = default)
    {
        var period = groupBy switch
        {
            "week" => $"date_trunc('week', i.created_at at time zone '{VietnamZone}')::date",
            "month" => $"date_trunc('month', i.created_at at time zone '{VietnamZone}')::date",
            _ => $"(i.created_at at time zone '{VietnamZone}')::date"
        };
        var parameters = CreateSalesParameters(filter);
        var sql = $"""
            select {period} as date,
                   count(distinct i.id) as invoice_count,
                   coalesce(sum(d.subtotal), 0) as total
            from invoice i
            join customer c on c.id = i.customer_id
            join invoice_detail d on d.invoice_id = i.id
            join product p on p.id = d.product_id
            {SalesWhere(filter, parameters)}
            group by {period}
            order by {period};
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<SalesSummaryDbRow>(new CommandDefinition(sql, parameters, cancellationToken: ct));
        return rows.Select(row => new SalesSummaryRowDto(row.Date, checked((int)row.InvoiceCount), row.Total)).ToList();
    }

    public async Task<IReadOnlyList<TopProductDto>> GetTopProductsAsync(SalesReportFilter filter, int limit, CancellationToken ct = default)
    {
        var parameters = CreateSalesParameters(filter);
        parameters.Add("limit", limit);
        var sql = $"""
            select p.id as product_id, p.sku, p.name,
                   sum(d.quantity) as quantity_sold,
                   count(distinct i.id) as invoice_count,
                   coalesce(sum(d.subtotal), 0) as revenue
            from invoice i
            join customer c on c.id = i.customer_id
            join invoice_detail d on d.invoice_id = i.id
            join product p on p.id = d.product_id
            {SalesWhere(filter, parameters)}
            group by p.id, p.sku, p.name
            order by revenue desc, quantity_sold desc, p.sku asc
            limit @limit;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<TopProductDbRow>(new CommandDefinition(sql, parameters, cancellationToken: ct));
        return rows.Select(row => new TopProductDto(row.ProductId, row.Sku, row.Name, checked((int)row.QuantitySold), checked((int)row.InvoiceCount), row.Revenue)).ToList();
    }

    public async Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(SalesReportFilter filter, int limit, CancellationToken ct = default)
    {
        var parameters = CreateSalesParameters(filter);
        parameters.Add("limit", limit);
        var sql = $"""
            select c.id as customer_id, c.name, c.phone, c.group_price,
                   count(distinct i.id) as invoice_count,
                   coalesce(sum(d.quantity), 0) as units_sold,
                   coalesce(sum(d.subtotal), 0) as revenue
            from invoice i
            join customer c on c.id = i.customer_id
            join invoice_detail d on d.invoice_id = i.id
            join product p on p.id = d.product_id
            {SalesWhere(filter, parameters)}
            group by c.id, c.name, c.phone, c.group_price
            order by revenue desc, invoice_count desc, c.name asc
            limit @limit;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<TopCustomerDbRow>(new CommandDefinition(sql, parameters, cancellationToken: ct));
        return rows.Select(row => new TopCustomerDto(row.CustomerId, row.Name, row.Phone, row.GroupPrice, checked((int)row.InvoiceCount), checked((int)row.UnitsSold), row.Revenue)).ToList();
    }

    public async Task<IReadOnlyList<InventoryFlowRowDto>> GetInventoryFlowAsync(DateOnly from, DateOnly to, short? transactionType, string? itemType, CancellationToken ct = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("from", from.ToDateTime(TimeOnly.MinValue));
        parameters.Add("to", to.ToDateTime(TimeOnly.MinValue));
        var conditions = new List<string> { "t.transaction_date between cast(@from as date) and cast(@to as date)" };
        if (transactionType is not null)
        {
            conditions.Add("t.type = @transaction_type");
            parameters.Add("transaction_type", transactionType);
        }

        var itemCondition = itemType switch
        {
            "product" => "d.product_id is not null",
            "backboard" => "d.backboard_id is not null",
            "material" => "d.material_id is not null",
            "sub-backboard" => "d.sub_backboard_id is not null",
            _ => null
        };
        if (itemCondition is not null) conditions.Add(itemCondition);

        var sql = $"""
            select t.transaction_date as date,
                   coalesce(sum(case when d.direction = 1 then d.quantity else 0 end), 0) as in_quantity,
                   coalesce(sum(case when d.direction = 2 then d.quantity else 0 end), 0) as out_quantity,
                   coalesce(sum(case when d.direction = 1 then d.total_price else 0 end), 0) as in_value,
                   coalesce(sum(case when d.direction = 2 then d.total_price else 0 end), 0) as out_value
            from inventory_transaction t
            join inventory_transaction_detail d on d.inventory_transaction_id = t.id
            where {string.Join(" and ", conditions)}
            group by t.transaction_date
            order by t.transaction_date;
            """;

        using var conn = factory.Create();
        var rows = await conn.QueryAsync<InventoryFlowDbRow>(new CommandDefinition(sql, parameters, cancellationToken: ct));
        return rows.Select(row => new InventoryFlowRowDto(row.Date, checked((int)row.InQuantity), checked((int)row.OutQuantity), row.InValue, row.OutValue)).ToList();
    }

    public async Task<PagedResult<InvoiceReportRowDto>> GetInvoiceDetailsAsync(SalesReportFilter filter, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var parameters = CreateSalesParameters(filter);
        parameters.Add("offset", (page - 1) * pageSize);
        parameters.Add("page_size", pageSize);
        var sql = $"""
            select i.id as invoice_id, i.created_at, c.id as customer_id, c.name as customer_name,
                   c.phone as customer_phone, c.group_price, d.product_id, p.sku,
                   d.product_name, d.quantity, d.unit_price, d.subtotal, d.description,
                   count(*) over() as total_count
            from invoice i
            join customer c on c.id = i.customer_id
            join invoice_detail d on d.invoice_id = i.id
            join product p on p.id = d.product_id
            {SalesWhere(filter, parameters)}
            order by i.created_at desc, i.id desc, d.product_name asc
            offset @offset limit @page_size;
            """;

        using var conn = factory.Create();
        var rows = (await conn.QueryAsync<InvoiceReportDbRow>(new CommandDefinition(sql, parameters, cancellationToken: ct))).AsList();
        var items = rows.Select(row => new InvoiceReportRowDto(
            row.InvoiceId, new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)), row.CustomerId, row.CustomerName, row.CustomerPhone,
            row.GroupPrice, row.ProductId, row.Sku, row.ProductName, row.Quantity,
            row.UnitPrice, row.Subtotal, row.Description)).ToList();
        return new PagedResult<InvoiceReportRowDto>(items, page, pageSize, rows.FirstOrDefault()?.TotalCount ?? 0);
    }

    private static DynamicParameters CreateSalesParameters(SalesReportFilter filter)
    {
        var parameters = new DynamicParameters();
        parameters.Add("from", filter.From.ToDateTime(TimeOnly.MinValue));
        parameters.Add("to", filter.To.ToDateTime(TimeOnly.MinValue));
        return parameters;
    }

    private static string SalesWhere(SalesReportFilter filter, DynamicParameters parameters)
    {
        var conditions = new List<string>
        {
            $"i.created_at >= (cast(@from as timestamp) at time zone '{VietnamZone}')",
            $"i.created_at < ((cast(@to as timestamp) + interval '1 day') at time zone '{VietnamZone}')"
        };
        if (filter.CategoryId is not null)
        {
            conditions.Add("exists (select 1 from product_category pc where pc.product_id = d.product_id and pc.category_id = @category_id)");
            parameters.Add("category_id", filter.CategoryId);
        }
        if (filter.ProductId is not null)
        {
            conditions.Add("d.product_id = @product_id");
            parameters.Add("product_id", filter.ProductId);
        }
        if (filter.CustomerId is not null)
        {
            conditions.Add("i.customer_id = @customer_id");
            parameters.Add("customer_id", filter.CustomerId);
        }
        if (!string.IsNullOrWhiteSpace(filter.GroupPrice))
        {
            conditions.Add("c.group_price = @group_price");
            parameters.Add("group_price", filter.GroupPrice);
        }
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            conditions.Add("(p.sku ilike @search or p.name ilike @search or c.name ilike @search or c.phone ilike @search)");
            parameters.Add("search", $"%{filter.Search.Trim()}%");
        }
        return "where " + string.Join(" and ", conditions);
    }

    private sealed record SalesOverviewDbRow(decimal Revenue, long InvoiceCount, long UnitsSold, decimal AverageInvoiceValue);
    private sealed record SalesSummaryDbRow(DateOnly Date, long InvoiceCount, decimal Total);
    private sealed record TopProductDbRow(long ProductId, string Sku, string Name, long QuantitySold, long InvoiceCount, decimal Revenue);
    private sealed record TopCustomerDbRow(long CustomerId, string Name, string Phone, string? GroupPrice, long InvoiceCount, long UnitsSold, decimal Revenue);
    private sealed record InventoryFlowDbRow(DateOnly Date, long InQuantity, long OutQuantity, decimal InValue, decimal OutValue);
    private sealed record InvoiceReportDbRow(
        string InvoiceId, DateTime CreatedAt, long CustomerId, string CustomerName, string CustomerPhone,
        string? GroupPrice, long ProductId, string Sku, string ProductName, int Quantity,
        decimal UnitPrice, decimal Subtotal, string? Description, long TotalCount);
}
