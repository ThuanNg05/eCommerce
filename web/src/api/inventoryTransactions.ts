import { apiGet, apiPost } from './client'
import type { PagedResult } from './inventory'

export interface TransactionDetailItem {
  productId?: number | null
  backboardId?: number | null
  materialId?: number | null
  frameId?: number | null
  subBackboardId?: number | null
  quantity: number
  unitPrice: number
  totalPrice: number
  direction: number // 1 = In, 2 = Out
}

export interface InventoryTransactionDto {
  id: number
  transactionCode: number
  type: number // 1 = Receipt (Nhập), 2 = Issue (Xuất)
  transactionDate: string
  note?: string | null
  createdAt: string
  details?: TransactionDetailItem[]
}

export interface CreateTransactionRequest {
  type: number
  note?: string | null
  details: TransactionDetailItem[]
}

// PENDING API: REST Endpoints for /api/inventory-transactions
export function fetchInventoryTransactions(
  search?: string,
  page = 1,
  pageSize = 50
): Promise<PagedResult<InventoryTransactionDto>> {
  // TODO: Pending backend API endpoint GET /api/inventory-transactions
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<InventoryTransactionDto>>(`/api/inventory-transactions?${q.toString()}`)
}

export function createInventoryTransaction(req: CreateTransactionRequest): Promise<InventoryTransactionDto> {
  // TODO: Pending backend API endpoint POST /api/inventory-transactions
  return apiPost<InventoryTransactionDto>('/api/inventory-transactions', req)
}
