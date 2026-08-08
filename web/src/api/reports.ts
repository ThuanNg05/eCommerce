import { apiGet } from './client'
import type { PagedResult } from './inventory'

export interface LowStockItemDto {
  productId: number
  sku: string
  name: string
  inStock: number
  warningStock: number
}

export interface SalesSummaryRowDto {
  date: string
  invoiceCount: number
  total: number
}

export interface SalesOverviewDto {
  revenue: number
  invoiceCount: number
  unitsSold: number
  averageInvoiceValue: number
}

export interface TopProductDto {
  productId: number
  sku: string
  name: string
  quantitySold: number
  invoiceCount: number
  revenue: number
}

export interface TopCustomerDto {
  customerId: number
  name: string
  phone: string
  groupPrice?: string | null
  invoiceCount: number
  unitsSold: number
  revenue: number
}

export interface InventoryFlowRowDto {
  date: string
  inQuantity: number
  outQuantity: number
  inValue: number
  outValue: number
}

export interface InvoiceReportRowDto {
  invoiceId: string
  createdAt: string
  customerId: number
  customerName: string
  customerPhone: string
  groupPrice?: string | null
  productId: number
  sku: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  description?: string | null
}

export interface SalesReportFilter {
  from?: string
  to?: string
  categoryId?: number
  productId?: number
  customerId?: number
  groupPrice?: 'L' | 'S' | string
  search?: string
}

function buildSalesQuery(filter: SalesReportFilter, extraParams?: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  if (filter.from) q.set('from', filter.from)
  if (filter.to) q.set('to', filter.to)
  if (filter.categoryId) q.set('categoryId', filter.categoryId.toString())
  if (filter.productId) q.set('productId', filter.productId.toString())
  if (filter.customerId) q.set('customerId', filter.customerId.toString())
  if (filter.groupPrice) q.set('groupPrice', filter.groupPrice)
  if (filter.search) q.set('search', filter.search)

  if (extraParams) {
    for (const [key, val] of Object.entries(extraParams)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, val.toString())
      }
    }
  }

  const str = q.toString()
  return str ? `?${str}` : ''
}

export function fetchSalesOverview(filter: SalesReportFilter): Promise<SalesOverviewDto> {
  return apiGet<SalesOverviewDto>(`/api/reports/sales-overview${buildSalesQuery(filter)}`)
}

export function fetchSalesSummary(filter: SalesReportFilter, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<SalesSummaryRowDto[]> {
  return apiGet<SalesSummaryRowDto[]>(`/api/reports/sales-summary${buildSalesQuery(filter, { groupBy })}`)
}

export function fetchTopProducts(filter: SalesReportFilter, limit = 10): Promise<TopProductDto[]> {
  return apiGet<TopProductDto[]>(`/api/reports/top-products${buildSalesQuery(filter, { limit })}`)
}

export function fetchTopCustomers(filter: SalesReportFilter, limit = 10): Promise<TopCustomerDto[]> {
  return apiGet<TopCustomerDto[]>(`/api/reports/top-customers${buildSalesQuery(filter, { limit })}`)
}

export function fetchInventoryFlow(
  from?: string,
  to?: string,
  transactionType?: number,
  itemType?: string,
): Promise<InventoryFlowRowDto[]> {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  if (transactionType !== undefined && transactionType !== null) q.set('transactionType', transactionType.toString())
  if (itemType) q.set('itemType', itemType)
  const queryString = q.toString() ? `?${q.toString()}` : ''
  return apiGet<InventoryFlowRowDto[]>(`/api/reports/inventory-flow${queryString}`)
}

export function fetchInvoiceDetails(
  filter: SalesReportFilter,
  page = 1,
  pageSize = 50,
): Promise<PagedResult<InvoiceReportRowDto>> {
  return apiGet<PagedResult<InvoiceReportRowDto>>(`/api/reports/invoice-details${buildSalesQuery(filter, { page, pageSize })}`)
}

export function fetchLowStockReports(): Promise<LowStockItemDto[]> {
  return apiGet<LowStockItemDto[]>('/api/reports/low-stock')
}
