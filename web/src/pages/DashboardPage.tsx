import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
} from '@mui/material'
import { Box as BoxIcon, FileText, AlertTriangle, TrendingUp } from 'lucide-react'
import { fetchLowStockReports, fetchSalesSummary } from '../api/reports'

export default function DashboardPage() {
  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)

  const { data: lowStockData, isLoading: isLowStockLoading } = useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: () => fetchLowStockReports(),
  })

  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ['reports', 'sales-summary'],
    queryFn: () => fetchSalesSummary({}),
  })

  const totalSalesRevenue = salesData?.reduce((acc, row) => acc + row.total, 0) || 0
  const totalInvoicesCount = salesData?.reduce((acc, row) => acc + row.invoiceCount, 0) || 0

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Title block */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
          Bảng điều khiển Vận hành
        </Typography>
        <Typography variant="body2" sx={{ color: '#737373' }}>
          Báo cáo nhanh cảnh báo tồn kho thấp và doanh số các ngày gần đây.
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
                Cảnh báo Tồn thấp
              </Typography>
              <AlertTriangle size={18} color="#b45309" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#b45309', mb: 0.5 }}>
              {isLowStockLoading ? '—' : lowStockData?.length || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 500 }}>
              Sản phẩm cần bổ sung
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
                Tổng Hóa đơn Gần đây
              </Typography>
              <FileText size={18} color="#737373" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
              {isSalesLoading ? '—' : totalInvoicesCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 500 }}>
              Hóa đơn đã ghi nhận
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
                Doanh số Gần đây
              </Typography>
              <TrendingUp size={18} color="#7299ED" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
              {isSalesLoading ? '—' : formatVND(totalSalesRevenue)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7299ED', fontWeight: 500 }}>
              Tổng doanh thu ghi nhận
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
                Trạng thái Xưởng
              </Typography>
              <BoxIcon size={18} color="#15803d" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#15803d', mb: 0.5 }}>
              Hoạt động
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 500 }}>
              Sẵn sàng gia công &amp; xuất kho
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Reports Tables Grid */}
      <Grid container spacing={3}>
        {/* Table 1: Low Stock Items */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#171717' }}>
              Danh sách Sản phẩm Cảnh báo Tồn thấp
            </Typography>

            <TableContainer sx={{ maxHeight: 360, overflowX: 'auto' }}>
              <Table stickyHeader size="small" sx={{ border: '1px solid #ededed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9f9f9', position: 'sticky', left: 0, zIndex: 4, width: 100 }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9f9f9', position: 'sticky', left: 100, zIndex: 4, borderRight: '1px solid #ededed', minWidth: 160 }}>TÊN SẢN PHẨM</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f9f9f9' }}>
                      TỒN KHO
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f9f9f9' }}>
                      NGƯỠNG
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStockData && lowStockData.length > 0 ? (
                    lowStockData.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell sx={{ fontFamily: 'monospace', position: 'sticky', left: 0, zIndex: 2, bgcolor: '#ffffff' }}>{row.sku}</TableCell>
                        <TableCell sx={{ position: 'sticky', left: 100, zIndex: 2, bgcolor: '#ffffff', borderRight: '1px solid #ededed' }}>{row.name}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={row.inStock}
                            size="small"
                            sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 600, borderRadius: '4px' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#737373', fontSize: 13 }}>
                          {row.warningStock ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#a3a3a3' }}>
                        {isLowStockLoading ? 'Đang tải dữ liệu...' : 'Không có sản phẩm nào bị cảnh báo tồn thấp.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Table 2: Sales Summary Rows */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#171717' }}>
              Doanh số Theo Ngày
            </Typography>

            <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small" sx={{ border: '1px solid #ededed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9f9f9' }}>NGÀY</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f9f9f9' }}>
                      SỐ HÓA ĐƠN
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f9f9f9' }}>
                      DOANH THU
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesData && salesData.length > 0 ? (
                    salesData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell align="right">{row.invoiceCount}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatVND(row.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#a3a3a3' }}>
                        {isSalesLoading ? 'Đang tải dữ liệu...' : 'Chưa có báo cáo doanh số gần đây.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
