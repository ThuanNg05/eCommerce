import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface FrameDto {
  id: number
  code: number
  description?: string | null
  status: number
  createdAt?: string
  updatedAt?: string
}

export interface CreateFrameRequest {
  code: number
  description?: string | null
}

export interface UpdateFrameRequest {
  code: number
  status: number
  description?: string | null
}

// PENDING API: REST Endpoints for /api/frames
export function fetchFrames(search?: string, page = 1, pageSize = 50): Promise<PagedResult<FrameDto>> {
  // TODO: Pending backend API endpoint GET /api/frames
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<FrameDto>>(`/api/frames?${q.toString()}`)
}

export function createFrame(req: CreateFrameRequest): Promise<FrameDto> {
  // TODO: Pending backend API endpoint POST /api/frames
  return apiPost<FrameDto>('/api/frames', req)
}

export function updateFrame(id: number, req: UpdateFrameRequest): Promise<FrameDto> {
  // TODO: Pending backend API endpoint PUT /api/frames/{id}
  return apiPut<FrameDto>(`/api/frames/${id}`, req)
}
