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
  createdAt?: string
  updatedAt?: string
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

// PENDING API: REST Endpoints for /api/customers
export function fetchCustomers(search?: string, page = 1, pageSize = 50): Promise<PagedResult<CustomerDto>> {
  // TODO: Pending backend API endpoint GET /api/customers
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (search) q.set('search', search)
  return apiGet<PagedResult<CustomerDto>>(`/api/customers?${q.toString()}`)
}

export function fetchCustomerById(id: number): Promise<CustomerDto> {
  // TODO: Pending backend API endpoint GET /api/customers/{id}
  return apiGet<CustomerDto>(`/api/customers/${id}`)
}

export function createCustomer(req: CreateCustomerRequest): Promise<CustomerDto> {
  // TODO: Pending backend API endpoint POST /api/customers
  return apiPost<CustomerDto>('/api/customers', req)
}

export function updateCustomer(id: number, req: UpdateCustomerRequest): Promise<CustomerDto> {
  // TODO: Pending backend API endpoint PUT /api/customers/{id}
  return apiPut<CustomerDto>(`/api/customers/${id}`, req)
}
