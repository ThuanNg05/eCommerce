import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  type CurrentUserResponse,
} from '../api/auth'
import {
  AUTH_INVALIDATED_EVENT,
  AUTH_REFRESHED_EVENT,
  clearSession,
  readSession,
  writeSession,
  type AuthSessionData,
} from './sessionStore'

interface AuthContextType {
  user: CurrentUserResponse | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<CurrentUserResponse>
  logout: () => Promise<void>
  updateSession: (session: AuthSessionData) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let disposed = false

    const syncUserFromStoredSession = () => {
      const session = readSession()
      setUser(
        session
          ? {
              id: session.id,
              username: session.username,
              roleId: session.roleId,
              role: session.role,
              mustChangePassword: session.mustChangePassword,
            }
          : null,
      )
    }

    const invalidate = () => setUser(null)
    window.addEventListener(AUTH_INVALIDATED_EVENT, invalidate)
    window.addEventListener(AUTH_REFRESHED_EVENT, syncUserFromStoredSession)

    const bootstrap = async () => {
      if (!readSession()) {
        if (!disposed) setIsLoading(false)
        return
      }

      try {
        const current = await getCurrentUser()
        if (!disposed) setUser(current)
      } catch {
        clearSession()
        if (!disposed) setUser(null)
      } finally {
        if (!disposed) setIsLoading(false)
      }
    }

    void bootstrap()

    // Detect a login from another device even while this client is idle.
    const sessionCheck = window.setInterval(async () => {
      if (!readSession()) return
      try {
        const current = await getCurrentUser()
        if (!disposed) setUser(current)
      } catch {
        clearSession()
        if (!disposed) setUser(null)
      }
    }, 30_000)

    return () => {
      disposed = true
      window.clearInterval(sessionCheck)
      window.removeEventListener(AUTH_INVALIDATED_EVENT, invalidate)
      window.removeEventListener(AUTH_REFRESHED_EVENT, syncUserFromStoredSession)
    }
  }, [])

  const updateSession = (session: AuthSessionData) => {
    writeSession(session)
    setUser({
      id: session.id,
      username: session.username,
      roleId: session.roleId,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
    })
  }

  const login = async (username: string, password: string): Promise<CurrentUserResponse> => {
    const session = await apiLogin(username, password)
    writeSession(session)
    const current: CurrentUserResponse = {
      id: session.id,
      username: session.username,
      roleId: session.roleId,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
    }
    setUser(current)
    return current
  }

  const logout = async () => {
    try {
      if (readSession()) await apiLogout()
    } finally {
      clearSession()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
