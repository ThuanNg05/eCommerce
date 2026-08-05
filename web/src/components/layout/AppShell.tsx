import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell() {
  const [userRole, setUserRole] = useState<'Admin' | 'Staff'>('Staff')

  const handleToggleRole = () => {
    setUserRole((prev) => (prev === 'Admin' ? 'Staff' : 'Admin'))
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f9f9f9' }}>
      {/* 240px Sidebar - Gated by userRole */}
      <Sidebar userRole={userRole} />

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
        <TopBar userRole={userRole} onToggleRole={handleToggleRole} />

        {/* Content Outlet with 24px padding */}
        <Box component="main" sx={{ p: 3, flex: 1, bgcolor: '#f9f9f9' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
