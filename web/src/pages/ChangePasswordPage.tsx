import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Eye, EyeOff, LogOut, KeyRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { changePassword as apiChangePassword } from '../api/auth'

export default function ChangePasswordPage() {
  const { user, logout, updateSession } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): string | null => {
    if (!currentPassword) {
      return 'Vui lòng nhập mật khẩu hiện tại.'
    }
    if (!newPassword) {
      return 'Vui lòng nhập mật khẩu mới.'
    }
    if (!confirmPassword) {
      return 'Vui lòng xác nhận mật khẩu mới.'
    }
    if (newPassword.length < 10) {
      return 'Mật khẩu mới phải có tối thiểu 10 ký tự.'
    }
    if (!/[A-Z]/.test(newPassword)) {
      return 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa.'
    }
    if (!/[a-z]/.test(newPassword)) {
      return 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết thường.'
    }
    if (!/[0-9]/.test(newPassword)) {
      return 'Mật khẩu mới phải chứa ít nhất 1 chữ số.'
    }
    if (user?.username && newPassword.toLowerCase().includes(user.username.toLowerCase())) {
      return 'Mật khẩu mới không được chứa tên đăng nhập.'
    }
    if (newPassword !== confirmPassword) {
      return 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
    }
    if (newPassword === currentPassword) {
      return 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const valError = validateForm()
    if (valError) {
      setErrorMsg(valError)
      return
    }

    setIsSubmitting(true)
    try {
      const newSession = await apiChangePassword({
        currentPassword,
        newPassword,
      })
      updateSession(newSession)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f9f9f9',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          px: { xs: 4, sm: 5 },
          py: { xs: 5, sm: 6 },
          bgcolor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
          <KeyRound size={28} style={{ color: '#111827' }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: '#111827',
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            Đổi mật khẩu
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: '#6b7280',
            textAlign: 'center',
            mb: 3.5,
          }}
        >
          {user?.mustChangePassword
            ? 'Mật khẩu của bạn cần được cập nhật trước khi truy cập hệ thống.'
            : 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.'}
        </Typography>

        {errorMsg && (
          <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ mb: 3, borderRadius: 0 }}>
            {errorMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: '#374151',
              mb: 1,
              display: 'block',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            MẬT KHẨU HIỆN TẠI
          </Typography>
          <TextField
            fullWidth
            size="medium"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Nhập mật khẩu hiện tại"
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end" sx={{ color: '#6b7280' }}>
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
            }}
          />

          {/* New Password */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: '#374151',
              mb: 1,
              display: 'block',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            MẬT KHẨU MỚI
          </Typography>
          <TextField
            fullWidth
            size="medium"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 10 ký tự, có chữ hoa, thường & số"
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNew(!showNew)} edge="end" sx={{ color: '#6b7280' }}>
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
            }}
          />

          {/* Confirm Password */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: '#374151',
              mb: 1,
              display: 'block',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            XÁC NHẬN MẬT KHẨU MỚI
          </Typography>
          <TextField
            fullWidth
            size="medium"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" sx={{ color: '#6b7280' }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
            }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              disableElevation
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                borderRadius: 0,
                fontWeight: 700,
                letterSpacing: '0.08em',
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                bgcolor: '#18181b',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#000000',
                },
              }}
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'ĐỔI MẬT KHẨU'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => logout()}
              disabled={isSubmitting}
              startIcon={<LogOut size={16} />}
              sx={{
                py: 1.2,
                borderRadius: 0,
                fontWeight: 600,
                borderColor: '#d1d5db',
                color: '#374151',
                '&:hover': {
                  borderColor: '#9ca3af',
                  bgcolor: '#f9fafb',
                },
              }}
            >
              Đăng xuất
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
