import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAuth } from '../../auth/AuthContext'

export default function AppShell() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('framing_sidebar_collapsed') === 'true'
  )

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('framing_sidebar_collapsed', String(next))
      return next
    })
  }

  const sidebarWidth = collapsed ? '64px' : '240px'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f9f9f9' }}>
      {/* Sidebar with collapse toggle */}
      <Sidebar
        userRole={user?.role || 'Staff'}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Layout Area */}
      <Box
        sx={{
          flex: 1,
          ml: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 0.2s ease-in-out',
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
