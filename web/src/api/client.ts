import {
  notifyAuthInvalidated,
  notifyAuthRefreshed,
  readSession,
  writeSession,
  type AuthSessionData,
} from '../auth/sessionStore'

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
let refreshPromise: Promise<boolean> | null = null
const inFlightWrites = new Map<string, Promise<unknown>>()
const CLIENT_REQUEST_TIMEOUT_MS = 65_000

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), CLIENT_REQUEST_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.')
    }
    if (!navigator.onLine) throw new Error('Không có kết nối mạng. Vui lòng kiểm tra và thử lại.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

async function parseError(res: Response): Promise<string> {
  if (res.status === 429) {
    return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau một phút.'
  }
  try {
    const problem = await res.json()
    return problem?.detail ?? problem?.title ?? problem?.message ?? `Lỗi hệ thống (${res.status}: ${res.statusText})`
  } catch {
    return `Lỗi hệ thống (${res.status}: ${res.statusText})`
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const session = readSession()
    if (!session?.refreshToken) return false

    const res = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
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
  headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION ?? 'web'
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  if (res.status === 401 && allowRefresh && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
    if (await refreshAccessToken()) return request<T>(method, path, body, false)
    notifyAuthInvalidated()
  }

  if (res.status === 403 && session?.mustChangePassword && window.location.pathname !== '/change-password') {
    window.location.href = '/change-password'
  }

  if (!res.ok) throw new Error(await parseError(res))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') return request<T>(method, path, body)

  const key = `${normalizedMethod} ${path}`
  const existing = inFlightWrites.get(key)
  if (existing) return existing as Promise<T>

  const pending = request<T>(method, path, body).finally(() => inFlightWrites.delete(key))
  inFlightWrites.set(key, pending)
  return pending
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('POST', path, body)
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('PUT', path, body)
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('PATCH', path, body)
}

export function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('DELETE', path, body)
}


export function resolveApiUrl(path?: string | null): string {
  if (!path) return ''
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path
  }
  const base = (API_BASE ?? '').replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
