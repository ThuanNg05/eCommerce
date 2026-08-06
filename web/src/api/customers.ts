import { apiGet, apiPost, apiPut } from './client'
import type { PagedResult } from './inventory'

export interface CustomerDto {
  id: number
  name: string
  phone: string
  address?: string | null
  email?: string | null
  groupPrice?: string | null
  description?: string | null
  updatedAt: string
}

export interface CreateCustomerRequest {
  name: string
  phone: string
  address?: string | null
  email?: string | null
  groupPrice?: string | null
  description?: string | null
}

export interface UpdateCustomerRequest {
  name: string
  phone: string
  address?: string | null
  email?: string | null
  groupPrice?: string | null
  description?: string | null
}

export function fetchCustomers(search?: string, page = 1, pageSize = 50): Promise<PagedResult<CustomerDto>> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<CustomerDto>>(`/api/customers?${q.toString()}`)
}

export function fetchCustomerById(id: number): Promise<CustomerDto> {
  return apiGet<CustomerDto>(`/api/customers/${id}`)
}

export function createCustomer(req: CreateCustomerRequest): Promise<CustomerDto> {
  return apiPost<CustomerDto>('/api/customers', req)
}

export function updateCustomer(id: number, req: UpdateCustomerRequest): Promise<CustomerDto> {
  return apiPut<CustomerDto>(`/api/customers/${id}`, req)
}
