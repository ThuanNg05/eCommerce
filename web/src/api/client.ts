import {
  notifyAuthInvalidated,
  notifyAuthRefreshed,
  readSession,
  writeSession,
  type AuthSessionData,
} from '../auth/sessionStore'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
let refreshPromise: Promise<boolean> | null = null

async function parseError(res: Response): Promise<string> {
  try {
    const problem = await res.json()
    return problem?.detail ?? problem?.title ?? `Lỗi hệ thống (${res.status}: ${res.statusText})`
  } catch {
    return `Lỗi hệ thống (${res.status}: ${res.statusText})`
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const session = readSession()
    if (!session?.refreshToken) return false

    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })

    if (!res.ok) return false
    writeSession((await res.json()) as AuthSessionData)
    notifyAuthRefreshed()
    return true
  })()

  try {
    return await refreshPromise
  } catch {
    return false
  } finally {
    refreshPromise = null
  }
}

async function request<T>(method: string, path: string, body?: unknown, allowRefresh = true): Promise<T> {
  const session = readSession()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && allowRefresh && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
    if (await refreshAccessToken()) return request<T>(method, path, body, false)
    notifyAuthInvalidated()
  }

  if (!res.ok) throw new Error(await parseError(res))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(method, path, body)
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('POST', path, body)
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('PUT', path, body)
}
