import { Navigate, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from './AuthContext'

const ADMIN_ONLY_ROUTES = ['/pricing', '/accounts', '/settings', '/audit', '/reports']

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

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
