import { apiGet } from './client'
import type { PagedResult } from './inventory'

export interface AuditLogDto {
  id: number
  tableName: string
  recordId: string
  action: string // 'I', 'U', 'D'
  oldValues?: string | null
  newValues?: string | null
  changedBy?: number | null
  changedAt: string
}

export function fetchAuditLogs(
  page = 1,
  pageSize = 50,
  table?: string,
  action?: string,
  search?: string
): Promise<PagedResult<AuditLogDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (table) q.set('table', table)
  if (action) q.set('action', action)
  if (search) q.set('search', search)
  return apiGet<PagedResult<AuditLogDto>>(`/api/audit?${q.toString()}`)
}
