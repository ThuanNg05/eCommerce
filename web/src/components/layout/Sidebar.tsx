import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import {
  LayoutDashboard,
  Box as BoxIcon,
  Tag,
  Frame,
  Layers,
  Package,
  ArrowLeftRight,
  Users,
  FileText,
  Calculator,
  BarChart3,
  UserCog,
  Settings,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export interface NavGroup {
  title: string
  adminOnly?: boolean
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'TỔNG QUAN',
    items: [{ label: 'Bảng điều khiển', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'DANH MỤC',
    items: [
      { label: 'Sản phẩm', path: '/products', icon: BoxIcon },
      { label: 'Danh mục', path: '/categories', icon: Tag },
      { label: 'Rập', path: '/frames', icon: Frame },
      { label: 'Kho ván ép', path: '/backboards', icon: Layers },
      { label: 'Ván hậu', path: '/sub-backboards', icon: Layers },
      { label: 'Vật liệu', path: '/materials', icon: Package },
    ],
  },
  {
    title: 'VẬN HÀNH',
    items: [
      { label: 'Kho (Nhập/Xuất)', path: '/inventory', icon: ArrowLeftRight },
      { label: 'Khách hàng', path: '/customers', icon: Users },
      { label: 'Hóa đơn', path: '/invoices', icon: FileText },
    ],
  },
  {
    title: 'QUẢN TRỊ',
    adminOnly: true,
    items: [
      { label: 'Định giá', path: '/pricing', icon: Calculator },
      { label: 'Báo cáo', path: '/reports', icon: BarChart3 },
      { label: 'Tài khoản', path: '/accounts', icon: UserCog },
      { label: 'Cấu hình email', path: '/settings', icon: Settings },
      { label: 'Nhật ký thay đổi', path: '/audit', icon: History },
    ],
  },
]

interface SidebarProps {
  userRole?: 'Admin' | 'Staff'
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ userRole = 'Admin', collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const visibleGroups = useMemo(() => {
    const filtered = NAV_GROUPS.filter((group) => !group.adminOnly || userRole === 'Admin')
    if (userRole === 'Staff') {
      const vanHanh = filtered.find((g) => g.title === 'VẬN HÀNH')
      const rest = filtered.filter((g) => g.title !== 'VẬN HÀNH')
      return vanHanh ? [vanHanh, ...rest] : filtered
    }
    return filtered
  }, [userRole])

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <Box
      component="aside"
      sx={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100vh',
        bgcolor: '#ffffff',
        borderRight: '1px solid #ededed',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1200,
        overflowY: 'auto',
        transition: 'width 0.2s ease-in-out, min-width 0.2s ease-in-out',
      }}
    >
      {/* App / Logo Block */}
      <Box
        sx={{
          height: 56,
          minHeight: 56,
          px: collapsed ? 1 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #ededed',
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                bgcolor: '#1a1a1a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              F
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', fontSize: 15 }}>
              Framing Admin
            </Typography>
          </Box>
        )}

        {onToggleCollapse && (
          <Tooltip title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} placement="right">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              aria-label="Toggle Sidebar"
              sx={{ color: '#737373', p: 0.5 }}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Nav Groups */}
      <Box sx={{ py: 1.5, flex: 1 }}>
        {visibleGroups.map((group) => (
          <Box key={group.title} sx={{ mb: 2 }}>
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2,
                  pt: 1.5,
                  pb: 0.5,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: '#a3a3a3',
                  textTransform: 'uppercase',
                }}
              >
                {group.title}
              </Typography>
            )}

            {group.items.map((item) => {
              const isActive = location.pathname === item.path
              const IconComp = item.icon

              const itemContent = (
                <Box
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    height: 40,
                    mx: 1,
                    my: '2px',
                    px: collapsed ? 0 : 1.5,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    bgcolor: isActive ? '#EEF3FD' : 'transparent',
                    color: isActive ? '#171717' : '#404040',
                    fontWeight: isActive ? 600 : 400,
                    position: 'relative',
                    transition: 'background-color 140ms ease, color 140ms ease',
                    '&:hover': {
                      bgcolor: isActive ? '#EEF3FD' : '#f2f2f2',
                    },
                    '&::before': isActive
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '8px',
                          bottom: '8px',
                          width: '2px',
                          bgcolor: '#7299ED',
                          borderRadius: '2px',
                        }
                      : undefined,
                  }}
                >
                  <IconComp
                    size={18}
                    color={isActive ? '#7299ED' : '#737373'}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {!collapsed && (
                    <Typography variant="body2" sx={{ fontSize: 14 }}>
                      {item.label}
                    </Typography>
                  )}
                </Box>
              )

              return collapsed ? (
                <Tooltip key={item.path} title={item.label} placement="right" arrow>
                  {itemContent}
                </Tooltip>
              ) : (
                itemContent
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
