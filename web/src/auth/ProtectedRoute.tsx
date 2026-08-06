import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const ADMIN_ONLY_ROUTES = ['/pricing', '/accounts', '/settings', '/audit', '/reports']

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  // 1. Not logged in -> Redirect to /login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 2. Staff user attempting to access Admin-only route -> Redirect to /dashboard
  if (user.role === 'Staff' && ADMIN_ONLY_ROUTES.some((path) => location.pathname.startsWith(path))) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
