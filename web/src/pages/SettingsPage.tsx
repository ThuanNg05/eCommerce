import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material'
import { Mail, Eye, EyeOff, Save, ShieldCheck, RefreshCw } from 'lucide-react'
import { fetchSmtpConfig, updateSmtpConfig, type UpdateSmtpConfigRequest } from '../api/settings'
import { formatDate } from '../utils/dateFormat'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState<UpdateSmtpConfigRequest>({
    address: '',
    appPassword: '',
    duration: '',
  })

  const { data: smtpData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings', 'smtp'],
    queryFn: fetchSmtpConfig,
  })

  useEffect(() => {
    if (smtpData) {
      setForm({
        address: smtpData.address || '',
        appPassword: '', // Password input is kept empty by default
        duration: smtpData.duration || '',
      })
    }
  }, [smtpData])

  const mutation = useMutation({
    mutationFn: updateSmtpConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'smtp'] })
      setActionMsg({
        type: 'success',
        text: 'Cập nhật cấu hình SMTP Email thành công!',
      })
      // Clear password field after successful save
      setForm((prev) => ({ ...prev, appPassword: '' }))
    },
    onError: (err: Error) => {
      setActionMsg({
        type: 'error',
        text: `Lỗi cập nhật cấu hình: ${err.message}`,
      })
    },
  })

  const handleSubmit = () => {
    setActionMsg(null)
    const payload: UpdateSmtpConfigRequest = {
      address: form.address,
      duration: form.duration || null,
      // If password field is empty, send undefined so server keeps existing password
      appPassword: form.appPassword && form.appPassword.trim() !== '' ? form.appPassword : undefined,
    }
    mutation.mutate(payload)
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* Action Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Cấu hình Hệ thống
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Thiết lập thông số tích hợp Email thông báo SMTP &amp; tham số hệ thống.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => refetch()}
          startIcon={<RefreshCw size={15} />}
          sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717' }}
        >
          Làm mới
        </Button>
      </Box>

      {actionMsg && (
        <Alert severity={actionMsg.type} onClose={() => setActionMsg(null)} sx={{ mb: 3, borderRadius: '6px' }}>
          {actionMsg.text}
        </Alert>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '6px' }}>
          Lỗi tải cấu hình SMTP: {(error as Error).message}
        </Alert>
      )}

      {/* SMTP Email Config Card */}
      <Paper elevation={0} sx={{ p: 3.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mail size={20} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717' }}>
                Cấu hình SMTP Email (FR012)
              </Typography>

              <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
                Gửi hóa đơn, thông báo tồn kho &amp; cảnh báo hệ thống tự động.
              </Typography>
            </Box>
          </Box>

          {/* Has Password Badge */}
          {smtpData?.hasPassword ? (
            <Chip
              icon={<ShieldCheck size={14} color="#15803d" />}
              label="Đã cấu hình mật khẩu"
              sx={{
                bgcolor: '#f0fdf4',
                color: '#15803d',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: '6px',
                px: 0.5,
              }}
            />
          ) : (
            <Chip
              label="Chưa cài mật khẩu"
              sx={{
                bgcolor: '#fffbeb',
                color: '#b45309',
                fontWeight: 500,
                fontSize: 12,
                borderRadius: '6px',
              }}
            />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={32} sx={{ color: '#7299ED' }} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Email Address */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: '#171717', fontWeight: 600, display: 'block', mb: 0.5 }}>
                ĐỊA CHỈ EMAIL SMTP *
              </Typography>
              <TextField
                fullWidth
                placeholder="vd: server-noreply@xuongkhungtranh.vn"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Grid>

            {/* Duration */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                HẠN THỜI GIAN / THỜI HẠN
              </Typography>
              <TextField
                fullWidth
                placeholder="vd: 2026-12-31"
                value={form.duration || ''}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                helperText="Ngày hết hạn hoặc thời hạn hiệu lực của tài khoản"
              />
            </Grid>

            {/* App Password */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#171717', fontWeight: 600, display: 'block', mb: 0.5 }}>
                MẬT KHẨU ỨNG DỤNG / APP PASSWORD
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder={smtpData?.hasPassword ? '••••••••••••••••' : 'Nhập mật khẩu ứng dụng SMTP mới...'}
                value={form.appPassword || ''}
                onChange={(e) => setForm({ ...form, appPassword: e.target.value })}
                helperText={
                  smtpData?.hasPassword
                    ? 'Để trống nếu muốn giữ nguyên mật khẩu cũ đã cấu hình.'
                    : 'Nhập App Password từ Google / Nhà cung cấp Mail.'
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Footer / Submit */}
            <Grid item xs={12} sx={{ pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#a3a3a3' }}>
                Cập nhật gần nhất: {formatDate(smtpData?.updatedAt)}
              </Typography>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={mutation.isPending || !form.address}
                startIcon={<Save size={16} />}
                sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
              >
                Lưu cấu hình SMTP
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  )
}
