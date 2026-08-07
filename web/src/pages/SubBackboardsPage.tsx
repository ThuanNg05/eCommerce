import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  Box,
  Typography,
  TextField,
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
import { Plus, RefreshCw, Edit3 } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchSubBackboards,
  createSubBackboard,
  updateSubBackboard,
  type SubBackboardDto,
  type CreateSubBackboardRequest,
  type UpdateSubBackboardRequest,
} from '../api/subBackboards'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'

export default function SubBackboardsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editSubBackboard, setEditSubBackboard] = useState<SubBackboardDto | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form States
  const [createForm, setCreateForm] = useState<CreateSubBackboardRequest>({
    size: '',
    inStock: 0,
    warningStock: 0,
    description: '',
  })

  const [editForm, setEditForm] = useState<UpdateSubBackboardRequest>({
    size: '',
    warningStock: 0,
    status: 1,
    description: '',
  })

  // Query Data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['subBackboards', search],
    queryFn: () => fetchSubBackboards(search, 1, 500),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createSubBackboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subBackboards'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateSubBackboardRequest }) => updateSubBackboard(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subBackboards'] })
      setEditSubBackboard(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setCreateForm({
      size: '',
      inStock: 0,
      warningStock: 0,
      description: '',
    })
    setActionError(null)
  }

  const handleOpenEdit = (sb: SubBackboardDto) => {
    setEditSubBackboard(sb)
    setEditForm({
      size: sb.size,
      warningStock: sb.warningStock || 0,
      status: sb.status,
      description: sb.description || '',
    })
    setActionError(null)
  }

  const columns = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'STT',
        width: 70,
        sortable: false,
        filter: false,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      },
      { field: 'size', headerName: 'KÍCH THƯỚC', width: 180, filter: true, sortable: true },
      {
        field: 'inStock',
        headerName: 'TỒN KHO',
        type: 'rightAligned',
        width: 130,
        sortable: true,
        cellRenderer: (p: { data?: SubBackboardDto; value: number }) => {
          if (!p.data) return p.value
          const isLowStock = p.data.inStock <= (p.data.warningStock ?? 0)
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, height: '100%' }}>
              <span>{p.value}</span>
              {isLowStock && (
                <Chip
                  label="Cần nhập"
                  size="small"
                  sx={{
                    bgcolor: '#fffbeb',
                    color: '#b45309',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: '4px',
                    height: 20,
                    px: 0.5,
                  }}
                />
              )}
            </Box>
          )
        },
      },
      {
        field: 'warningStock',
        headerName: 'TỒN KHO TỐI THIỂU',
        type: 'rightAligned',
        width: 150,
        sortable: true,
      },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 120,
        cellRenderer: (p: { value: number }) => (
          <Chip
            label={p.value === 1 ? 'Hoạt động' : 'Ngưng'}
            size="small"
            sx={{
              bgcolor: p.value === 1 ? '#f0fdf4' : '#fef2f2',
              color: p.value === 1 ? '#15803d' : '#b91c1c',
              fontSize: 12,
              borderRadius: '4px',
            }}
          />
        ),
      },
      { field: 'description', headerName: 'MÔ TẢ', flex: 1, minWidth: 180 },
      {
        headerName: 'THAO TÁC',
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: SubBackboardDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Sửa thông tin ván hậu">
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
            Quản lý Chi tiết ván hậu
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Thông số ván hậu theo các quy chuẩn kích thước.
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
            Thêm
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo kích thước ván hậu (vd: 30x40)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Hiển thị: <strong>{data?.items.length ?? 0}</strong> / Tổng số: <strong>{data?.totalCount ?? 0}</strong> ván hậu
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
          <AgGridReact<SubBackboardDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            quickFilterText={search}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu ván hậu phụ</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
          />
        </div>
      </Paper>

      {/* CREATE SUB-BACKBOARD DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Thêm ván hậu mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                KÍCH THƯỚC (SIZE) *
              </Typography>
              <TextField
                fullWidth
                value={createForm.size}
                onChange={(e) => setCreateForm({ ...createForm, size: e.target.value })}
                placeholder="vd: 30x40 cm"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỒN BAN ĐẦU *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.inStock}
                onChange={(e) => setCreateForm({ ...createForm, inStock: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỒN KHO TỐI THIỂU *
              </Typography>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                value={createForm.warningStock}
                onChange={(e) => setCreateForm({ ...createForm, warningStock: Math.max(0, Number(e.target.value)) })}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÔ TẢ
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={createForm.description || ''}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Mô tả thông số quy chuẩn ván hậu..."
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
            disabled={createMutation.isPending || !createForm.size}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT SUB-BACKBOARD DIALOG */}
      <Dialog
        open={Boolean(editSubBackboard)}
        onClose={() => setEditSubBackboard(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Cập nhật ván hậu: {editSubBackboard?.size}
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
                KÍCH THƯỚC (SIZE) *
              </Typography>
              <TextField
                fullWidth
                value={editForm.size}
                onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỒN KHO TỐI THIỂU *
              </Typography>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                value={editForm.warningStock}
                onChange={(e) => setEditForm({ ...editForm, warningStock: Math.max(0, Number(e.target.value)) })}
              />
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
                <MenuItem value={0}>Ngưng kinh doanh</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÔ TẢ
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
          <Button onClick={() => setEditSubBackboard(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => editSubBackboard && updateMutation.mutate({ id: editSubBackboard.id, req: editForm })}
            variant="contained"
            disabled={updateMutation.isPending || !editForm.size}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
