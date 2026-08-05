import { apiGet, apiPost, apiPut } from './client'

export interface ProductDto {
  id: number
  sku: string
  name: string
  description?: string | null
  basePrice: number
  priceRetail?: number | null
  priceWholesale?: number | null
  subBackboardId?: number | null
  inStock: number
  warningStock: number
  status: number
  updatedAt: string
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string | null
  basePrice: number
  priceRetail?: number | null
  priceWholesale?: number | null
  subBackboardId?: number | null
  inStock: number
  warningStock: number
}

export interface UpdateProductRequest {
  name: string
  description?: string | null
  basePrice: number
  priceRetail?: number | null
  priceWholesale?: number | null
  subBackboardId?: number | null
  warningStock: number
  status: number
}

export interface StockAdjustmentRequest {
  delta: number
  reason?: string | null
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export function fetchInventory(search?: string, page = 1, pageSize = 200): Promise<PagedResult<ProductDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<ProductDto>>(`/api/inventory?${q.toString()}`)
}

export function fetchProductById(id: number): Promise<ProductDto> {
  return apiGet<ProductDto>(`/api/inventory/${id}`)
}

export function createProduct(req: CreateProductRequest): Promise<ProductDto> {
  return apiPost<ProductDto>('/api/inventory', req)
}

export function updateProduct(id: number, req: UpdateProductRequest): Promise<ProductDto> {
  return apiPut<ProductDto>(`/api/inventory/${id}`, req)
}

export function adjustStock(id: number, req: StockAdjustmentRequest): Promise<ProductDto> {
  return apiPost<ProductDto>(`/api/inventory/${id}/adjust`, req)
}
