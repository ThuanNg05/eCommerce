import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface BackboardDto {
  id: number
  type: number
  importPrice: number
  salePrice?: number | null
  inStock: number
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
  description?: string | null
}

export interface UpdateBackboardRequest {
  type: number
  importPrice: number
  salePrice?: number | null
  status: number
  description?: string | null
}

// PENDING API: REST Endpoints for /api/backboards
export function fetchBackboards(search?: string, page = 1, pageSize = 50): Promise<PagedResult<BackboardDto>> {
  // TODO: Pending backend API endpoint GET /api/backboards
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<BackboardDto>>(`/api/backboards?${q.toString()}`)
}

export function createBackboard(req: CreateBackboardRequest): Promise<BackboardDto> {
  // TODO: Pending backend API endpoint POST /api/backboards
  return apiPost<BackboardDto>('/api/backboards', req)
}

export function updateBackboard(id: number, req: UpdateBackboardRequest): Promise<BackboardDto> {
  // TODO: Pending backend API endpoint PUT /api/backboards/{id}
  return apiPut<BackboardDto>(`/api/backboards/${id}`, req)
}
