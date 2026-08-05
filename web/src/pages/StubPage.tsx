import { Box, Paper, Typography } from '@mui/material'

interface StubPageProps {
  title: string
  subtitle?: string
}

export default function StubPage({ title, subtitle }: StubPageProps) {
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#737373' }}>
          {subtitle || 'Tính năng đang được phát triển.'}
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 6,
          bgcolor: '#ffffff',
          border: '1px solid #ededed',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <Typography variant="body1" sx={{ color: '#737373', mb: 1, fontWeight: 500 }}>
          Màn hình {title}
        </Typography>
        <Typography variant="caption" sx={{ color: '#a3a3a3' }}>
          Khung giao diện (App Shell) đã sẵn sàng. Dữ liệu sẽ được kết nối với backend API.
        </Typography>
      </Paper>
    </Box>
  )
}
