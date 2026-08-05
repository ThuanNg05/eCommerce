import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Search, LogOut, Shield, User } from 'lucide-react'

interface TopBarProps {
  userRole: 'Admin' | 'Staff'
  onToggleRole: () => void
  userName?: string
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Bảng điều khiển',
  '/products': 'Quản lý Sản phẩm',
  '/categories': 'Quản lý Danh mục',
  '/frames': 'Quản lý Khung tranh',
  '/backboards': 'Quản lý Tấm lưng',
  '/sub-backboards': 'Quản lý Tấm lưng phụ',
  '/materials': 'Quản lý Vật liệu',
  '/inventory': 'Quản lý Kho (Nhập / Xuất)',
  '/customers': 'Quản lý Khách hàng',
  '/invoices': 'Quản lý Hóa đơn',
  '/pricing': 'Định giá & Công thức',
  '/reports': 'Báo cáo Doanh thu & Tồn kho',
  '/accounts': 'Quản lý Tài khoản & Phân quyền',
  '/settings': 'Cấu hình Email & Hệ thống',
  '/audit': 'Nhật ký Thay đổi (Audit Log)',
}

export default function TopBar({ userRole, onToggleRole, userName = 'Admin User' }: TopBarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const title = PAGE_TITLES[location.pathname] || 'Trang quản trị'

  return (
    <Box
      component="header"
      sx={{
        height: 56,
        minHeight: 56,
        bgcolor: '#ffffff',
        borderBottom: '1px solid #ededed',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Left: Page Title */}
      <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, color: '#171717' }}>
        {title}
      </Typography>

      {/* Right Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Search Field */}
        <TextField
          placeholder="Tìm kiếm..."
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color="#a3a3a3" />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 220,
            '& .MuiOutlinedInput-root': {
              height: 36,
              borderRadius: '6px',
              bgcolor: '#ffffff',
              fontSize: 13,
            },
          }}
        />

        {/* Role Toggle Chip (For testing Admin vs Staff nav visibility) */}
        <Tooltip title="Nhấn để chuyển Vai trò (Admin / Staff)">
          <Chip
            icon={<Shield size={14} color="#7299ED" />}
            label={`Role: ${userRole}`}
            onClick={onToggleRole}
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#e0e0e0',
              bgcolor: '#ffffff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
          />
        </Tooltip>

        {/* User Chip */}
        <Chip
          icon={<User size={14} color="#737373" />}
          label={userName}
          variant="outlined"
          size="small"
          sx={{
            borderColor: '#e0e0e0',
            bgcolor: '#ffffff',
            fontSize: 13,
            fontWeight: 500,
          }}
        />

        {/* Sign Out Button */}
        <Tooltip title="Đăng xuất">
          <IconButton
            size="small"
            onClick={() => navigate('/login')}
            sx={{
              color: '#737373',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
              p: '6px',
              '&:hover': { bgcolor: '#f2f2f2', color: '#171717' },
            }}
          >
            <LogOut size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
