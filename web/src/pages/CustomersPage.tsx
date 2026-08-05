import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
} from '@mui/material'
import { Search, Plus, RefreshCw } from 'lucide-react'
import { fetchCustomers, type CustomerDto } from '../api/customers'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Query Pending API
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => fetchCustomers(search),
  })

  const columns = useMemo<ColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 90, sortable: true },
      { field: 'name', headerName: 'TÊN KHÁCH HÀNG', flex: 1, minWidth: 200, filter: true, sortable: true },
      { field: 'phone', headerName: 'SỐ ĐIỆN THOẠI', width: 140, filter: true, sortable: true },
      { field: 'email', headerName: 'EMAIL', width: 180 },
      { field: 'address', headerName: 'ĐỊA CHỈ', flex: 1, minWidth: 220 },
      { field: 'groupPrice', headerName: 'NHÓM GIÁ', width: 110 },
      { field: 'description', headerName: 'GHI CHÚ', width: 160 },
    ],
    [],
  )

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Quản lý Khách hàng
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Danh sách thông tin khách hàng mua lẻ và đại lý mua sỉ.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            startIcon={<RefreshCw size={15} />}
            sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717', '&:hover': { bgcolor: '#f2f2f2' } }}
          >
            Làm mới
          </Button>

          <Button
            variant="contained"
            onClick={() => setIsCreateOpen(true)}
            startIcon={<Plus size={16} />}
            sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
          >
            Thêm khách hàng
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#a3a3a3" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 320 }}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Tổng số: <strong>{data?.totalCount ?? 0}</strong> khách hàng
          </Typography>
        </Box>
      </Paper>

      {/* Pending API Notice Banner */}
      <Alert severity="info" sx={{ mb: 2, borderRadius: '6px' }}>
        Tính năng Quản lý Khách hàng đang chờ Backend hoàn thiện API endpoint <code>GET /api/customers</code>.
      </Alert>

      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Chưa thể lấy dữ liệu: {(error as Error).message} (chờ backend endpoint).
        </Box>
      )}

      {/* AG Grid Table */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          border: '1px solid #ededed',
          borderRadius: '8px',
          overflow: 'hidden',
          height: 'calc(100vh - 310px)',
          minHeight: 360,
        }}
      >
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<CustomerDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu (Chờ Backend API /api/customers)</span>'
            animateRows
            pagination
            paginationPageSize={50}
          />
        </div>
      </Paper>

      {/* Add Dialog */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Thêm khách hàng mới</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>TÊN KHÁCH HÀNG *</Typography>
              <TextField fullWidth placeholder="vd: Nguyễn Văn A" />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>SỐ ĐIỆN THOẠI *</Typography>
              <TextField fullWidth placeholder="vd: 0901234567" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>ĐỊA CHỈ</Typography>
              <TextField fullWidth placeholder="Địa chỉ giao hàng..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} variant="outlined" color="inherit">Hủy</Button>
          <Button variant="contained" disabled sx={{ bgcolor: '#1a1a1a' }}>Lưu (Chờ API)</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
