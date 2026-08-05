import { apiGet } from './client'

export interface LowStockItemDto {
  productId: number
  sku: string
  name: string
  inStock: number
}

export interface SalesSummaryRowDto {
  date: string
  invoiceCount: number
  total: number
}

export function fetchLowStockReports(): Promise<LowStockItemDto[]> {
  return apiGet<LowStockItemDto[]>('/api/reports/low-stock')
}

export function fetchSalesSummary(from?: string, to?: string): Promise<SalesSummaryRowDto[]> {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const queryString = q.toString() ? `?${q.toString()}` : ''
  return apiGet<SalesSummaryRowDto[]>(`/api/reports/sales-summary${queryString}`)
}
