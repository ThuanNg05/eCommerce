import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface FrameLineDto {
  subBackboardId: number
  quantity: number
}

export interface FrameDto {
  id: number
  code: number
  description?: string | null
  status: number
  updatedAt: string
  lines: FrameLineDto[]
}

export interface CreateFrameRequest {
  code: number
  description?: string | null
  lines: { subBackboardId: number; quantity: number }[]
}

export interface UpdateFrameRequest {
  code: number
  description?: string | null
  status: number
  lines: { subBackboardId: number; quantity: number }[]
}

export function fetchFrames(search?: string, page = 1, pageSize = 50): Promise<PagedResult<FrameDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<FrameDto>>(`/api/frames?${q.toString()}`)
}

export function fetchFrame(id: number): Promise<FrameDto> {
  return apiGet<FrameDto>(`/api/frames/${id}`)
}

export function createFrame(req: CreateFrameRequest): Promise<FrameDto> {
  return apiPost<FrameDto>('/api/frames', req)
}

export function updateFrame(id: number, req: UpdateFrameRequest): Promise<FrameDto> {
  return apiPut<FrameDto>(`/api/frames/${id}`, req)
}
