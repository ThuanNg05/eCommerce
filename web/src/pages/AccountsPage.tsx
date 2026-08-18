import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { autoSizeGridColumns, AG_GRID_AUTO_SIZE_STRATEGY } from '../utils/agGridAutoSize'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Paper,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Plus, RefreshCw, Edit3, Eye, EyeOff } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  type AccountDto,
  type CreateAccountRequest,
  type UpdateAccountRequest,
} from '../api/accounts'

import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'
import { formatDate } from '../utils/dateFormat'

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<AccountDto | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Password Visibility Toggles
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // Form States
  const [createForm, setCreateForm] = useState<CreateAccountRequest>({
    username: '',
    password: '',
    roleId: 2, // Default to Staff (2)
  })

  const [editForm, setEditForm] = useState<UpdateAccountRequest>({
    roleId: 2,
    status: 1,
    password: '',
  })

  // Query Data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['accounts', search],
    queryFn: () => fetchAccounts(search, 1, 500),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateAccountRequest }) => updateAccount(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setEditAccount(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      password: '',
      roleId: 2,
    })
    setShowCreatePassword(false)
    setActionError(null)
  }

  const handleOpenEdit = (acc: AccountDto) => {
    setEditAccount(acc)
    setEditForm({
      roleId: acc.roleId,
      status: acc.status,
      password: '',
    })
    setShowEditPassword(false)
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
      { field: 'username', headerName: 'TÊN ĐĂNG NHẬP', minWidth: 150, filter: true, sortable: true },
      {
        field: 'role',
        headerName: 'VAI TRÒ',
        width: 140,
        sortable: true,
        cellRenderer: (p: { value: string }) => {
          const isAdmin = p.value === 'Admin'
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Chip
                label={p.value}
                size="small"
                sx={{
                  bgcolor: isAdmin ? '#eff6ff' : '#f3f4f6',
                  color: isAdmin ? '#1d4ed8' : '#374151',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: '4px',
                  height: 24,
                }}
              />
            </Box>
          )
        },
      },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 170,
        sortable: true,
        cellRenderer: (p: { data?: AccountDto; value: number }) => {
          if (!p.data) return null
          const isLocked = Boolean(p.data.lockedUntil && new Date(p.data.lockedUntil) > new Date())
          const mustChange = p.data.mustChangePassword

          let label = 'Đã khóa'
          let bgcolor = '#f3f4f6'
          let color = '#6b7280'

          if (isLocked) {
            label = 'Đang khóa'
            bgcolor = '#fef2f2'
            color = '#b91c1c'
          } else if (mustChange) {
            label = 'Chờ đổi mật khẩu'
            bgcolor = '#fffbeb'
            color = '#b45309'
          } else if (p.data.status === 1) {
            label = 'Đang hoạt động'
            bgcolor = '#f0fdf4'
            color = '#15803d'
          }

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Chip
                label={label}
                size="small"
                sx={{
                  bgcolor,
                  color,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: '4px',
                  height: 24,
                }}
              />
            </Box>
          )
        },
      },
      {
        field: 'createdAt',
        headerName: 'NGÀY TẠO',
        width: 180,
        sortable: true,
        valueFormatter: (p) => formatDate(p.value),
      },
      {
        headerName: 'THAO TÁC',
        width: 90,
        minWidth: 80,
        maxWidth: 100,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: AccountDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Sửa tài khoản">
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
            Quản lý Tài khoản
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Quản lý tài khoản đăng nhập và phân quyền truy cập hệ thống.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            startIcon={<RefreshCw size={15} />}
            sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717' }}
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
            sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff' }}
          >
            Thêm mới
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo tên đăng nhập..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Hiển thị: <strong>{data?.items.length ?? 0}</strong> / Tổng số: <strong>{data?.totalCount ?? 0}</strong> tài khoản
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
          <AgGridReact<AccountDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            autoSizeStrategy={AG_GRID_AUTO_SIZE_STRATEGY}
            onFirstDataRendered={(params) => autoSizeGridColumns(params.api)}
            onRowDataUpdated={(params) => autoSizeGridColumns(params.api)}
            loading={isLoading}
            quickFilterText={search}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu tài khoản</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
          />
        </div>
      </Paper>

      {/* CREATE ACCOUNT DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Thêm tài khoản mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN ĐĂNG NHẬP *
              </Typography>
              <TextField
                fullWidth
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="vd: nhanvien01"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MẬT KHẨU * (Tối thiểu 6 ký tự)
              </Typography>
              <TextField
                fullWidth
                type={showCreatePassword ? 'text' : 'password'}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Nhập mật khẩu..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCreatePassword(!showCreatePassword)} edge="end">
                        {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                VAI TRÒ *
              </Typography>
              <TextField
                select
                fullWidth
                value={createForm.roleId}
                onChange={(e) => setCreateForm({ ...createForm, roleId: Number(e.target.value) })}
              >
                <MenuItem value={1}>Admin (Quản trị viên)</MenuItem>
                <MenuItem value={2}>Staff (Nhân viên vận hành)</MenuItem>
              </TextField>
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
            disabled={createMutation.isPending || !createForm.username.trim() || !createForm.password}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Tạo tài khoản
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT ACCOUNT DIALOG */}
      <Dialog
        open={Boolean(editAccount)}
        onClose={() => setEditAccount(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Cập nhật tài khoản: {editAccount?.username}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN ĐĂNG NHẬP
              </Typography>
              <TextField fullWidth value={editAccount?.username || ''} disabled sx={{ bgcolor: '#f9f9f9' }} />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                VAI TRÒ *
              </Typography>
              <TextField
                select
                fullWidth
                value={editForm.roleId}
                onChange={(e) => setEditForm({ ...editForm, roleId: Number(e.target.value) })}
              >
                <MenuItem value={1}>Admin (Quản trị viên)</MenuItem>
                <MenuItem value={2}>Staff (Nhân viên vận hành)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TRẠNG THÁI *
              </Typography>
              <TextField
                select
                fullWidth
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: Number(e.target.value) })}
              >
                <MenuItem value={1}>Hoạt động</MenuItem>
                <MenuItem value={0}>Đã khóa</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                ĐỔI MẬT KHẨU (Để trống nếu giữ nguyên mật khẩu cũ)
              </Typography>
              <TextField
                fullWidth
                type={showEditPassword ? 'text' : 'password'}
                value={editForm.password || ''}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Nhập mật khẩu mới..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowEditPassword(!showEditPassword)} edge="end">
                        {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditAccount(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => editAccount && updateMutation.mutate({ id: editAccount.id, req: editForm })}
            variant="contained"
            disabled={updateMutation.isPending}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
