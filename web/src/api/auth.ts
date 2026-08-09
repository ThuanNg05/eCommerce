import { apiGet, apiPost } from './client'
import type { AuthSessionData } from '../auth/sessionStore'

export type LoginResponse = AuthSessionData

export interface CurrentUserResponse {
  id: number
  username: string
  roleId: number
  role: 'Admin' | 'Staff'
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    return await apiPost<LoginResponse>('/api/auth/login', { username, password })
  } catch {
    throw new Error('Sai tên đăng nhập hoặc mật khẩu')
  }
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/api/auth/me')
}

export function logout(): Promise<void> {
  return apiPost<void>('/api/auth/logout')
}
