import { apiGet, apiPost } from './client'
import type { AuthSessionData } from '../auth/sessionStore'

export type LoginResponse = AuthSessionData

export interface CurrentUserResponse {
  id: number
  username: string
  roleId: number
  role: 'Admin' | 'Staff'
  mustChangePassword: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/auth/login', { username, password })
}

export function changePassword(req: ChangePasswordRequest): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/auth/change-password', req)
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/api/auth/me')
}

export function logout(): Promise<void> {
  return apiPost<void>('/api/auth/logout')
}
