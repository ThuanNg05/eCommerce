import { apiGet, apiPost } from './client'
import type { PagedResult } from './inventory'

export interface TransactionLineDto {
  productId: number | null
  backboardId: number | null
  materialId: number | null
  frameId: number | null
  subBackboardId: number | null
  quantity: number
  unitPrice: number
  totalPrice: number
  direction: 1 | 2 // 1 = Nhập, 2 = Xuất
}

export interface InventoryTransactionDto {
  id: number
  transactionCode: number
  type: 1 | 2 // 1 = Nhập kho, 2 = Xuất kho
  transactionDate: string
  note: string | null
  createdAt: string
  details: TransactionLineDto[]
}

export type CreateTransactionLineRequest = Omit<TransactionLineDto, 'totalPrice'>

export interface CreateInventoryTransactionRequest {
  type: 1 | 2
  note?: string | null
  details: CreateTransactionLineRequest[]
}

export function fetchInventoryTransactions(
  search?: string,
  page = 1,
  pageSize = 50,
): Promise<PagedResult<InventoryTransactionDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<InventoryTransactionDto>>(`/api/inventory-transactions?${q.toString()}`)
}

export function fetchInventoryTransactionById(id: number): Promise<InventoryTransactionDto> {
  return apiGet<InventoryTransactionDto>(`/api/inventory-transactions/${id}`)
}

export function createInventoryTransaction(
  req: CreateInventoryTransactionRequest,
): Promise<InventoryTransactionDto> {
  return apiPost<InventoryTransactionDto>('/api/inventory-transactions', req)
}

export interface CreateBackboardConversionRequest {
  backboardId: number
  frameId: number
  quantity: number
  note?: string | null
}

export function createBackboardConversion(
  request: CreateBackboardConversionRequest,
): Promise<InventoryTransactionDto> {
  return apiPost<InventoryTransactionDto>(
    '/api/inventory-transactions/backboard-conversions',
    request,
  )
}
