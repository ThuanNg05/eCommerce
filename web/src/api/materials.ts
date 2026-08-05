import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface MaterialDto {
  id: number
  name: string
  importPrice: number
  salePrice: number
  inStock: number
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
  description?: string | null
}

export interface UpdateMaterialRequest {
  name: string
  importPrice: number
  salePrice: number
  status: number
  description?: string | null
}

// PENDING API: REST Endpoints for /api/materials
export function fetchMaterials(search?: string, page = 1, pageSize = 50): Promise<PagedResult<MaterialDto>> {
  // TODO: Pending backend API endpoint GET /api/materials
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<MaterialDto>>(`/api/materials?${q.toString()}`)
}

export function createMaterial(req: CreateMaterialRequest): Promise<MaterialDto> {
  // TODO: Pending backend API endpoint POST /api/materials
  return apiPost<MaterialDto>('/api/materials', req)
}

export function updateMaterial(id: number, req: UpdateMaterialRequest): Promise<MaterialDto> {
  // TODO: Pending backend API endpoint PUT /api/materials/{id}
  return apiPut<MaterialDto>(`/api/materials/${id}`, req)
}
