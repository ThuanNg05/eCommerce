import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
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
  fetchMaterials,
  createMaterial,
  updateMaterial,
  type MaterialDto,
  type CreateMaterialRequest,
  type UpdateMaterialRequest,
} from '../api/materials'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'

const formatVND = (v?: number | null) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

export default function MaterialsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editMaterial, setEditMaterial] = useState<MaterialDto | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form States
  const [createForm, setCreateForm] = useState<CreateMaterialRequest>({
    name: '',
    unit: '',
    importPrice: 0,
    salePrice: 0,
    inStock: 0,
    warningStock: 0,
    description: '',
  })

  const [editForm, setEditForm] = useState<UpdateMaterialRequest>({
    name: '',
    unit: '',
    importPrice: 0,
    salePrice: 0,
    warningStock: 0,
    status: 1,
    description: '',
  })

  // Query Data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['materials', search],
    queryFn: () => fetchMaterials(search, 1, 500),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (req: CreateMaterialRequest) =>
      createMaterial({
        ...req,
        unit: req.unit?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateMaterialRequest }) =>
      updateMaterial(id, {
        ...req,
        unit: req.unit?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setEditMaterial(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      unit: '',
      importPrice: 0,
      salePrice: 0,
      inStock: 0,
      warningStock: 0,
      description: '',
    })
    setActionError(null)
  }

  const handleOpenEdit = (m: MaterialDto) => {
    setEditMaterial(m)
    setEditForm({
      name: m.name,
      unit: m.unit || '',
      importPrice: m.importPrice,
      salePrice: m.salePrice,
      warningStock: m.warningStock || 0,
      status: m.status,
      description: m.description || '',
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
      { field: 'name', headerName: 'TÊN VẬT LIỆU', flex: 1, minWidth: 180, filter: true, sortable: true },
      {
        field: 'unit',
        headerName: 'ĐƠN VỊ',
        width: 100,
        filter: true,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<MaterialDto, string>) => p.value || '—',
      },
      {
        field: 'importPrice',
        headerName: 'GIÁ NHẬP',
        type: 'rightAligned',
        width: 130,
        valueFormatter: (p: ValueFormatterParams<MaterialDto, number>) => formatVND(p.value),
      },
      {
        field: 'salePrice',
        headerName: 'GIÁ BÁN',
        type: 'rightAligned',
        width: 130,
        valueFormatter: (p: ValueFormatterParams<MaterialDto, number>) => formatVND(p.value),
      },
      {
        field: 'inStock',
        headerName: 'TỒN KHO',
        type: 'rightAligned',
        width: 130,
        sortable: true,
      },
      {
        field: 'warningStock',
        headerName: 'TỐI THIỂU',
        type: 'rightAligned',
        width: 150,
        sortable: true,
      },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 120,
        cellRenderer: (p: { value: number }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Chip
              label={p.value === 1 ? 'Hoạt động' : 'Ngưng'}
              size="small"
              sx={{
                bgcolor: p.value === 1 ? '#f0fdf4' : '#fef2f2',
                color: p.value === 1 ? '#15803d' : '#b91c1c',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: '4px',
                height: 24,
              }}
            />
          </Box>
        ),
      },
      {
        headerName: 'THAO TÁC',
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: MaterialDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Sửa thông tin vật liệu">
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
            Quản lý Vật liệu
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Danh mục kính, bo, keo, phụ kiện gia công khung tranh.
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
            placeholder="Tìm tên vật liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Hiển thị: <strong>{data?.items.length ?? 0}</strong> / Tổng số: <strong>{data?.totalCount ?? 0}</strong> vật liệu
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
          <AgGridReact<MaterialDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            rowClassRules={{
              'ag-row-warning-stock': (params) =>
                Boolean(params.data && params.data.inStock <= (params.data.warningStock ?? 0)),
            }}
            loading={isLoading}
            quickFilterText={search}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu vật liệu</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
          />
        </div>
      </Paper>

      {/* CREATE MATERIAL DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Thêm vật liệu mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN VẬT LIỆU *
              </Typography>
              <TextField
                fullWidth
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="vd: Kính Trắng 3mm"
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                ĐƠN VỊ TÍNH
              </Typography>
              <TextField
                fullWidth
                inputProps={{ maxLength: 50 }}
                value={createForm.unit || ''}
                onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                placeholder="kg, m, tấm..."
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GIÁ NHẬP (VND) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.importPrice}
                onChange={(e) => setCreateForm({ ...createForm, importPrice: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GIÁ BÁN (VND) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.salePrice}
                onChange={(e) => setCreateForm({ ...createForm, salePrice: Number(e.target.value) })}
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
                TỐI THIỂU *
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
                placeholder="Ghi chú thêm về vật liệu..."
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
            disabled={createMutation.isPending || !createForm.name}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT MATERIAL DIALOG */}
      <Dialog
        open={Boolean(editMaterial)}
        onClose={() => setEditMaterial(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Cập nhật vật liệu: {editMaterial?.name}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN VẬT LIỆU *
              </Typography>
              <TextField
                fullWidth
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                ĐƠN VỊ TÍNH
              </Typography>
              <TextField
                fullWidth
                inputProps={{ maxLength: 50 }}
                value={editForm.unit || ''}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                placeholder="kg, m, tấm..."
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GIÁ NHẬP (VND) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={editForm.importPrice}
                onChange={(e) => setEditForm({ ...editForm, importPrice: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GIÁ BÁN (VND) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={editForm.salePrice}
                onChange={(e) => setEditForm({ ...editForm, salePrice: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỐI THIỂU *
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
          <Button onClick={() => setEditMaterial(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => editMaterial && updateMutation.mutate({ id: editMaterial.id, req: editForm })}
            variant="contained"
            disabled={updateMutation.isPending || !editForm.name}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
