import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập Username.')
      return
    }
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập Password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(username.trim(), password.trim())
      navigate('/dashboard')
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Sai tên đăng nhập hoặc mật khẩu')
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
          maxWidth: 420,
          px: { xs: 4, sm: 5 },
          py: { xs: 5, sm: 6 },
          bgcolor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 0,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: '#111827',
            mb: 4,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Sign In
        </Typography>

        {errorMsg && (
          <Alert
            severity="error"
            onClose={() => setErrorMsg('')}
            sx={{ mb: 3, borderRadius: 0 }}
          >
            {errorMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
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
            USERNAME
          </Typography>
          <TextField
            fullWidth
            size="medium"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            variant="outlined"
            disabled={isSubmitting}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
              '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
            }}
          />

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
            PASSWORD
          </Typography>
          <TextField
            fullWidth
            size="medium"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            variant="outlined"
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#6b7280', borderRadius: 0 }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
              '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
            }}
          />

          <Box
            sx={{
              display: 'flex',
              justify: 'flex-end',
              mb: 4,
            }}
          >
            <Link
              href="#"
              underline="always"
              onClick={(e) => {
                e.preventDefault()
                alert('Liên hệ quản trị viên để đặt lại mật khẩu')
              }}
              sx={{
                color: '#111827',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecorationColor: '#111827',
              }}
            >
              Forgot Password?
            </Link>
          </Box>

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
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'LOGIN'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
