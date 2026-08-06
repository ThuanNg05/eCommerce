import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface BackboardDto {
  id: number
  type: number
  importPrice: number
  salePrice?: number | null
  inStock: number
  warningStock: number
  status: number
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateBackboardRequest {
  type: number
  importPrice: number
  salePrice?: number | null
  inStock: number
  warningStock: number
  description?: string | null
}

export interface UpdateBackboardRequest {
  type: number
  importPrice: number
  salePrice?: number | null
  warningStock: number
  status: number
  description?: string | null
}

export function fetchBackboards(search?: string, page = 1, pageSize = 50): Promise<PagedResult<BackboardDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<BackboardDto>>(`/api/backboards?${q.toString()}`)
}

export function createBackboard(req: CreateBackboardRequest): Promise<BackboardDto> {
  return apiPost<BackboardDto>('/api/backboards', req)
}

export function updateBackboard(id: number, req: UpdateBackboardRequest): Promise<BackboardDto> {
  return apiPut<BackboardDto>(`/api/backboards/${id}`, req)
}
