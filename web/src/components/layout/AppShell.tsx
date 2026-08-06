import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAuth } from '../../auth/AuthContext'

export default function AppShell() {
  const { user } = useAuth()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f9f9f9' }}>
      {/* 240px Sidebar - Gated by user.role */}
      <Sidebar userRole={user?.role || 'Staff'} />

      {/* Main Layout Area */}
      <Box
        sx={{
          flex: 1,
          ml: '240px', // Offset for fixed 240px sidebar
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* TopBar Header */}
        <TopBar />

        {/* Content Outlet with 24px padding */}
        <Box component="main" sx={{ p: 3, flex: 1, bgcolor: '#f9f9f9' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
