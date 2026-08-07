import { apiGet, apiPost, apiPut } from './client'

export interface InvoiceLineDto {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  description?: string | null
}

export interface InvoiceDto {
  id: string
  customerId: number
  total: number
  createdAt: string
  updatedAt: string
  lines: InvoiceLineDto[]
}

export interface InvoiceSummaryDto {
  id: string
  customerId: number
  total: number
  createdAt: string
}

export interface CreateInvoiceLineRequest {
  productId: number
  quantity: number
  unitPrice?: number | null
  description?: string | null
}

export interface CreateInvoiceRequest {
  customerId: number
  lines: CreateInvoiceLineRequest[]
}

export interface UpdateInvoiceRequest {
  customerId: number
  lines: CreateInvoiceLineRequest[]
}

export function fetchInvoices(page = 1, pageSize = 50): Promise<InvoiceSummaryDto[]> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  return apiGet<InvoiceSummaryDto[]>(`/api/invoices?${q.toString()}`)
}

export function fetchInvoiceById(id: string): Promise<InvoiceDto> {
  return apiGet<InvoiceDto>(`/api/invoices/${encodeURIComponent(id)}`)
}

export function createInvoice(req: CreateInvoiceRequest): Promise<InvoiceDto> {
  return apiPost<InvoiceDto>('/api/invoices', req)
}

export function updateInvoice(id: string, req: UpdateInvoiceRequest): Promise<InvoiceDto> {
  return apiPut<InvoiceDto>(`/api/invoices/${encodeURIComponent(id)}`, req)
}
