import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface AccountDto {
  id: number
  username: string
  roleId: number
  role: string
  status: number
  mustChangePassword: boolean
  lockedUntil: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAccountRequest {
  username: string
  password: string
  roleId: number
}

export interface UpdateAccountRequest {
  roleId: number
  status: number
  password?: string | null
}

export function fetchAccounts(search?: string, page = 1, pageSize = 50): Promise<PagedResult<AccountDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<AccountDto>>(`/api/accounts?${q.toString()}`)
}

export function createAccount(req: CreateAccountRequest): Promise<AccountDto> {
  return apiPost<AccountDto>('/api/accounts', req)
}

export function updateAccount(id: number, req: UpdateAccountRequest): Promise<AccountDto> {
  return apiPut<AccountDto>(`/api/accounts/${id}`, req)
}
