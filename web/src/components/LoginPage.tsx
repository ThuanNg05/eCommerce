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
} from '@mui/material'

interface LoginPageProps {
  onLoginSuccess?: (userRole: string, username: string) => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!username.trim()) {
      setErrorMsg('Please enter your Username.')
      return
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your Password.')
      return
    }

    if (onLoginSuccess) {
      onLoginSuccess('User', username.trim())
    }
    navigate('/dashboard')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f9f9f9', // Page background
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
          bgcolor: '#ffffff', // Frame background
          border: '1px solid #e5e7eb',
          borderRadius: 0, // Sharp corners
        }}
      >
        {/* Main Heading: 'Sign In' */}
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
          {/* Label 1: Username */}
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
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0, // Sharp corners
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
              '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
            }}
          />

          {/* Label 2: Password */}
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
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            variant="outlined"
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0, // Sharp corners
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d1d5db', borderRadius: 0 },
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#111827' },
              },
              '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
            }}
          />

          {/* Right-aligned Forgot Password Link */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
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

          {/* Solid Dark LOGIN Button */}
          <Button
            type="submit"
            fullWidth
            size="large"
            variant="contained"
            disableElevation
            sx={{
              py: 1.5,
              borderRadius: 0, // Sharp corners
              fontWeight: 700,
              letterSpacing: '0.08em',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              bgcolor: '#18181b', // Solid dark black
              color: '#ffffff',
              '&:hover': {
                bgcolor: '#000000',
              },
            }}
          >
            LOGIN
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
