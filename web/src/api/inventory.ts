import { apiGet } from './client'

export interface ProductDto {
  id: string
  sku: string
  name: string
  description?: string | null
  unitPrice: number
  quantityOnHand: number
  reorderLevel: number
  isActive: boolean
  updatedAt: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export function fetchInventory(search?: string): Promise<PagedResult<ProductDto>> {
  const q = new URLSearchParams({ pageSize: '200' })
  if (search) q.set('search', search)
  return apiGet<PagedResult<ProductDto>>(`/api/inventory?${q.toString()}`)
}
