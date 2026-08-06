import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface MaterialDto {
  id: number
  name: string
  importPrice: number
  salePrice: number
  inStock: number
  warningStock: number
  status: number
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateMaterialRequest {
  name: string
  importPrice: number
  salePrice: number
  inStock: number
  warningStock: number
  description?: string | null
}

export interface UpdateMaterialRequest {
  name: string
  importPrice: number
  salePrice: number
  warningStock: number
  status: number
  description?: string | null
}

export function fetchMaterials(search?: string, page = 1, pageSize = 50): Promise<PagedResult<MaterialDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<MaterialDto>>(`/api/materials?${q.toString()}`)
}

export function createMaterial(req: CreateMaterialRequest): Promise<MaterialDto> {
  return apiPost<MaterialDto>('/api/materials', req)
}

export function updateMaterial(id: number, req: UpdateMaterialRequest): Promise<MaterialDto> {
  return apiPut<MaterialDto>(`/api/materials/${id}`, req)
}
