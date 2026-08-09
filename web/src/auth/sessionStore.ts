export interface AuthSessionData {
  id: number
  username: string
  roleId: number
  role: 'Admin' | 'Staff'
  mustChangePassword: boolean
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  sessionExpiresAt: string
}

const STORAGE_KEY = 'framing_auth_session_v2'
const LEGACY_STORAGE_KEY = 'framing_auth_session'

export const AUTH_INVALIDATED_EVENT = 'warehouse:auth-invalidated'
export const AUTH_REFRESHED_EVENT = 'warehouse:auth-refreshed'

export function readSession(): AuthSessionData | null {
  // Never trust the old localStorage-only user object.
  localStorage.removeItem(LEGACY_STORAGE_KEY)

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSessionData
    if (!session.accessToken || !session.refreshToken || new Date(session.sessionExpiresAt) <= new Date()) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function writeSession(session: AuthSessionData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function notifyAuthInvalidated() {
  clearSession()
  window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT))
}

export function notifyAuthRefreshed() {
  window.dispatchEvent(new Event(AUTH_REFRESHED_EVENT))
}
