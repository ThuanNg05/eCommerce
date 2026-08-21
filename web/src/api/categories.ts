import { apiGet, apiPost, apiPut, apiPatch } from './client'
import type { PagedResult } from './inventory'

export interface WooCommerceCategoryLinkDto {
  categoryId: number
  wooCommerceCategoryId: number
}

export interface CategoryDto {
  id: number
  name: string
  isActive?: boolean
  createdAt?: string
  wooCommerceLink?: WooCommerceCategoryLinkDto | null
}

export interface CreateCategoryRequest {
  name: string
  syncToWooCommerce?: boolean
}

export interface UpdateCategoryRequest {
  name: string
}

export interface UpdateCategoryStatusRequest {
  isActive: boolean
}

// REST Endpoints for /api/categories
export function fetchCategories(search?: string, page = 1, pageSize = 50): Promise<PagedResult<CategoryDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<CategoryDto>>(`/api/categories?${q.toString()}`)
}

export function createCategory(req: CreateCategoryRequest): Promise<CategoryDto> {
  return apiPost<CategoryDto>('/api/categories', req)
}

export function updateCategory(id: number, req: UpdateCategoryRequest): Promise<CategoryDto> {
  return apiPut<CategoryDto>(`/api/categories/${id}`, req)
}

export function updateCategoryStatus(
  id: number,
  req: UpdateCategoryStatusRequest,
): Promise<CategoryDto> {
  return apiPatch<CategoryDto>(`/api/categories/${id}/status`, req)
}

export function publishAndLinkWarehouseCategory(
  categoryId: number,
): Promise<WooCommerceCategoryLinkDto> {
  return apiPost<WooCommerceCategoryLinkDto>('/api/woocommerce/categories/publish-link', { categoryId })
}

export function fetchCategoryLink(
  categoryId: number,
): Promise<WooCommerceCategoryLinkDto> {
  return apiGet<WooCommerceCategoryLinkDto>(`/api/woocommerce/categories/${categoryId}/link`)
}


