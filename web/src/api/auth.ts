import { apiPost } from './client'

export interface LoginResponse {
  id: number
  username: string
  roleId: number
  role: 'Admin' | 'Staff'
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    return await apiPost<LoginResponse>('/api/auth/login', { username, password })
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || ''
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid')) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu')
    }
    throw new Error('Sai tên đăng nhập hoặc mật khẩu')
  }
}
