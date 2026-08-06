import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface CategoryDto {
  id: number
  name: string
  createdAt?: string
}

export interface CreateCategoryRequest {
  name: string
}

export interface UpdateCategoryRequest {
  name: string
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
