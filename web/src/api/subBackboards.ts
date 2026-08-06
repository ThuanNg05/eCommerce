import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface SubBackboardDto {
  id: number
  size: string
  inStock: number
  warningStock: number
  status: number
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateSubBackboardRequest {
  size: string
  inStock: number
  warningStock: number
  description?: string | null
}

export interface UpdateSubBackboardRequest {
  size: string
  warningStock: number
  status: number
  description?: string | null
}

export function fetchSubBackboards(search?: string, page = 1, pageSize = 50): Promise<PagedResult<SubBackboardDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<SubBackboardDto>>(`/api/sub-backboards?${q.toString()}`)
}

export function createSubBackboard(req: CreateSubBackboardRequest): Promise<SubBackboardDto> {
  return apiPost<SubBackboardDto>('/api/sub-backboards', req)
}

export function updateSubBackboard(id: number, req: UpdateSubBackboardRequest): Promise<SubBackboardDto> {
  return apiPut<SubBackboardDto>(`/api/sub-backboards/${id}`, req)
}
