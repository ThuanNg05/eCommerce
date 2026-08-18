import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { autoSizeGridColumns, AG_GRID_AUTO_SIZE_STRATEGY } from '../utils/agGridAutoSize'
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Plus, RefreshCw, Edit3 } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  type CustomerDto,
  type CreateCustomerRequest,
  type UpdateCustomerRequest,
} from '../api/customers'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'

export const GROUP_PRICE_LABEL: Record<string, string> = {
  L: 'Lẻ',
  S: 'Sỉ',
}

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CustomerDto | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form States
  const [createForm, setCreateForm] = useState<CreateCustomerRequest>({
    name: '',
    phone: '',
    address: '',
    email: '',
    groupPrice: 'S', // Default to Sỉ
    description: '',
  })

  const [editForm, setEditForm] = useState<UpdateCustomerRequest>({
    name: '',
    phone: '',
    address: '',
    email: '',
    groupPrice: 'S',
    description: '',
  })

  // Fetch up to 500 records so AG Grid sorts, filters, and paginates on the full dataset without truncation
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => fetchCustomers(search, 1, 500),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateCustomerRequest }) => updateCustomer(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditCustomer(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      phone: '',
      address: '',
      email: '',
      groupPrice: 'S',
      description: '',
    })
    setActionError(null)
  }

  const handleOpenEdit = (c: CustomerDto) => {
    setEditCustomer(c)
    setEditForm({
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      email: c.email || '',
      groupPrice: c.groupPrice || 'S',
      description: c.description || '',
    })
    setActionError(null)
  }

  const columns = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'STT',
        width: 70,
        minWidth: 60,
        maxWidth: 80,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      },
      { field: 'name', headerName: 'TÊN KHÁCH HÀNG', minWidth: 150, filter: true, sortable: true },
      { field: 'phone', headerName: 'SỐ ĐIỆN THOẠI', width: 140, filter: true, sortable: true },
      { field: 'email', headerName: 'EMAIL', width: 180 },
      { field: 'address', headerName: 'ĐỊA CHỈ', minWidth: 160 },
      {
        field: 'groupPrice',
        headerName: 'NHÓM GIÁ',
        width: 120,
        sortable: true,
        cellRenderer: (p: { value?: string | null }) => {
          const val = p.value || 'S'
          const isRetail = val === 'L'
          return (
            <Chip
              label={GROUP_PRICE_LABEL[val] || val}
              size="small"
              sx={{
                bgcolor: isRetail ? '#f0fdf4' : '#fffbeb',
                color: isRetail ? '#15803d' : '#b45309',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: '4px',
                height: 24,
              }}
            />
          )
        },
      },
      { field: 'description', headerName: 'GHI CHÚ', width: 160 },
      {
        headerName: 'THAO TÁC',
        width: 90,
        minWidth: 80,
        maxWidth: 100,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: CustomerDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Sửa thông tin khách hàng">
                <IconButton size="small" onClick={() => handleOpenEdit(p.data)} sx={{ color: '#404040' }}>
                  <Edit3 size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          )
        },
      },
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
            onClick={() => {
              resetCreateForm()
              setIsCreateOpen(true)
            }}
            startIcon={<Plus size={16} />}
            sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
          >
            Thêm mới
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Hiển thị: <strong>{data?.items.length ?? 0}</strong> / Tổng số: <strong>{data?.totalCount ?? 0}</strong> khách hàng
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể lấy dữ liệu: {(error as Error).message}
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
          height: 'calc(100vh - 270px)',
          minHeight: 360,
        }}
      >
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<CustomerDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            autoSizeStrategy={AG_GRID_AUTO_SIZE_STRATEGY}
            onFirstDataRendered={(params) => autoSizeGridColumns(params.api)}
            onRowDataUpdated={(params) => autoSizeGridColumns(params.api)}
            loading={isLoading}
            quickFilterText={search}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu khách hàng</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
          />
        </div>
      </Paper>

      {/* CREATE CUSTOMER DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Thêm khách hàng mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN KHÁCH HÀNG *
              </Typography>
              <TextField
                fullWidth
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="vd: Nguyễn Văn A"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                SỐ ĐIỆN THOẠI *
              </Typography>
              <TextField
                fullWidth
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="vd: 0901234567"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                EMAIL
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={createForm.email || ''}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="vd: khachhang@gmail.com"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                NHÓM GIÁ *
              </Typography>
              <TextField
                select
                fullWidth
                value={createForm.groupPrice || 'S'}
                onChange={(e) => setCreateForm({ ...createForm, groupPrice: e.target.value })}
              >
                <MenuItem value="S">Sỉ (Đại lý)</MenuItem>
                <MenuItem value="L">Lẻ (Khách mua lẻ)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                ĐỊA CHỈ
              </Typography>
              <TextField
                fullWidth
                value={createForm.address || ''}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="Địa chỉ giao hàng..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GHI CHÚ
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={createForm.description || ''}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Ghi chú thêm về khách hàng..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => createMutation.mutate(createForm)}
            variant="contained"
            disabled={createMutation.isPending || !createForm.name || !createForm.phone}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT CUSTOMER DIALOG */}
      <Dialog
        open={Boolean(editCustomer)}
        onClose={() => setEditCustomer(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Cập nhật thông tin khách hàng: {editCustomer?.name}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN KHÁCH HÀNG *
              </Typography>
              <TextField
                fullWidth
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                SỐ ĐIỆN THOẠI *
              </Typography>
              <TextField
                fullWidth
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                EMAIL
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                NHÓM GIÁ *
              </Typography>
              <TextField
                select
                fullWidth
                value={editForm.groupPrice || 'S'}
                onChange={(e) => setEditForm({ ...editForm, groupPrice: e.target.value })}
              >
                <MenuItem value="S">Sỉ (Đại lý)</MenuItem>
                <MenuItem value="L">Lẻ (Khách mua lẻ)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                ĐỊA CHỈ
              </Typography>
              <TextField
                fullWidth
                value={editForm.address || ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GHI CHÚ
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditCustomer(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => editCustomer && updateMutation.mutate({ id: editCustomer.id, req: editForm })}
            variant="contained"
            disabled={updateMutation.isPending || !editForm.name || !editForm.phone}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
