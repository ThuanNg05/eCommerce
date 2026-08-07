const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function parseError(res: Response): Promise<string> {
  try {
    const problem = await res.json()
    return problem?.detail ?? problem?.title ?? `Lỗi hệ thống (${res.status}: ${res.statusText})`
  } catch {
    return `Lỗi hệ thống (${res.status}: ${res.statusText})`
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()) as T
}

export async function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()) as T
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('POST', path, body)
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('PUT', path, body)
}
