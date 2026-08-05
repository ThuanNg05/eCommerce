import { Box, Grid, Paper, Typography } from '@mui/material'
import { Box as BoxIcon, FileText, Users, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Title block */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
          Tổng quan xưởng khung tranh
        </Typography>
        <Typography variant="body2" sx={{ color: '#737373' }}>
          Theo dõi các chỉ số chính về doanh thu, tồn kho và vận hành xưởng.
        </Typography>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, fontWeight: 500 }}>
                Tổng sản phẩm
              </Typography>
              <BoxIcon size={18} color="#737373" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
              1.240
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 500 }}>
              +12 sản phẩm mới
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, fontWeight: 500 }}>
                Hóa đơn tháng này
              </Typography>
              <FileText size={18} color="#737373" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
              86
            </Typography>
            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
              Doanh thu: {formatVND(142500000)}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, fontWeight: 500 }}>
                Khách hàng thân thiết
              </Typography>
              <Users size={18} color="#737373" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
              342
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 500 }}>
              +5 khách hàng tuần này
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, fontWeight: 500 }}>
                Cảnh báo sắp hết kho
              </Typography>
              <AlertTriangle size={18} color="#b45309" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#b45309', mb: 0.5 }}>
              8
            </Typography>
            <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 500 }}>
              Cần nhập thêm khung/vật liệu
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
