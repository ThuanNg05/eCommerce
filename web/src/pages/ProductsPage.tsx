import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
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
import { Search, Plus, RefreshCw, SlidersHorizontal, Edit3 } from 'lucide-react'
import {
  fetchInventory,
  createProduct,
  updateProduct,
  adjustStock,
  type ProductDto,
  type CreateProductRequest,
  type UpdateProductRequest,
} from '../api/inventory'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductDto | null>(null)
  const [adjustProductTarget, setAdjustProductTarget] = useState<ProductDto | null>(null)

  // Form States
  const [createForm, setCreateForm] = useState<CreateProductRequest>({
    sku: '',
    name: '',
    description: '',
    basePrice: 0,
    priceRetail: 0,
    priceWholesale: 0,
    subBackboardId: null,
    inStock: 0,
  })

  const [editForm, setEditForm] = useState<UpdateProductRequest>({
    name: '',
    description: '',
    basePrice: 0,
    priceRetail: 0,
    priceWholesale: 0,
    subBackboardId: null,
    status: 1,
  })

  const [adjustForm, setAdjustForm] = useState({
    delta: 0,
    reason: '',
  })

  const [actionError, setActionError] = useState<string | null>(null)

  // Query Data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => fetchInventory(search),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateProductRequest }) => updateProduct(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setEditProduct(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta, reason }: { id: number; delta: number; reason: string }) =>
      adjustStock(id, { delta, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setAdjustProductTarget(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setCreateForm({
      sku: '',
      name: '',
      description: '',
      basePrice: 0,
      priceRetail: 0,
      priceWholesale: 0,
      subBackboardId: null,
      inStock: 0,
    })
    setActionError(null)
  }

  const handleOpenEdit = (p: ProductDto) => {
    setEditProduct(p)
    setEditForm({
      name: p.name,
      description: p.description || '',
      basePrice: p.basePrice,
      priceRetail: p.priceRetail || 0,
      priceWholesale: p.priceWholesale || 0,
      subBackboardId: p.subBackboardId,
      status: p.status,
    })
    setActionError(null)
  }

  const handleOpenAdjust = (p: ProductDto) => {
    setAdjustProductTarget(p)
    setAdjustForm({ delta: 0, reason: '' })
    setActionError(null)
  }

  const columns = useMemo<ColDef[]>(
    () => [
      {
        field: 'sku',
        headerName: 'SKU',
        width: 130,
        filter: true,
        sortable: true,
      },
      {
        field: 'name',
        headerName: 'TÊN SẢN PHẨM',
        flex: 1,
        minWidth: 220,
        filter: true,
        sortable: true,
      },
      {
        field: 'basePrice',
        headerName: 'GIÁ GỐC',
        type: 'rightAligned',
        width: 130,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number>) => formatVND(p.value),
      },
      {
        field: 'priceRetail',
        headerName: 'BÁN LẺ',
        type: 'rightAligned',
        width: 130,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number | null>) => formatVND(p.value),
      },
      {
        field: 'priceWholesale',
        headerName: 'BÁN SỈ',
        type: 'rightAligned',
        width: 130,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number | null>) => formatVND(p.value),
      },
      {
        field: 'inStock',
        headerName: 'TỒN KHO',
        type: 'rightAligned',
        width: 110,
        sortable: true,
      },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 120,
        sortable: true,
        cellRenderer: (p: { value: number }) => {
          const isActive = p.value === 1
          return (
            <Chip
              label={isActive ? 'Hoạt động' : 'Ngưng'}
              size="small"
              sx={{
                bgcolor: isActive ? '#f0fdf4' : '#fef2f2',
                color: isActive ? '#15803d' : '#b91c1c',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: '4px',
                height: 24,
              }}
            />
          )
        },
      },
      {
        headerName: 'THAO TÁC',
        width: 150,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: ProductDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Sửa sản phẩm">
                <IconButton size="small" onClick={() => handleOpenEdit(p.data)} sx={{ color: '#404040' }}>
                  <Edit3 size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Điều chỉnh tồn kho">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleOpenAdjust(p.data)}
                  startIcon={<SlidersHorizontal size={14} />}
                  sx={{
                    height: 28,
                    fontSize: 12,
                    px: 1,
                    borderColor: '#e0e0e0',
                    color: '#171717',
                    '&:hover': { bgcolor: '#f2f2f2' },
                  }}
                >
                  Kho
                </Button>
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
      {/* Action Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Danh sách Sản phẩm
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Quản lý tồn kho, định giá bán lẻ &amp; bán sỉ sản phẩm khung tranh.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            startIcon={<RefreshCw size={15} />}
            sx={{
              height: 36,
              borderColor: '#e0e0e0',
              color: '#171717',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
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
            sx={{
              height: 36,
              bgcolor: '#1a1a1a',
              color: '#ffffff',
              '&:hover': { bgcolor: '#000000' },
            }}
          >
            Thêm sản phẩm
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
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
            Tổng số: <strong>{data?.totalCount ?? 0}</strong> sản phẩm
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể tải danh sách sản phẩm: {(error as Error).message}
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
          minHeight: 400,
        }}
      >
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<ProductDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
          />
        </div>
      </Paper>

      {/* CREATE PRODUCT DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Thêm sản phẩm mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÃ SKU *
              </Typography>
              <TextField
                fullWidth
                value={createForm.sku}
                onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })}
                placeholder="vd: KHUNG-GO-3040"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TÊN SẢN PHẨM *
              </Typography>
              <TextField
                fullWidth
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="vd: Khung Gỗ Tự Nhiên 30x40"
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GIÁ GỐC (VND)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.basePrice}
                onChange={(e) => setCreateForm({ ...createForm, basePrice: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                BÁN LẺ (VND)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.priceRetail || 0}
                onChange={(e) => setCreateForm({ ...createForm, priceRetail: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                BÁN SỈ (VND)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.priceWholesale || 0}
                onChange={(e) => setCreateForm({ ...createForm, priceWholesale: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỒN BAN ĐẦU
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createForm.inStock}
                onChange={(e) => setCreateForm({ ...createForm, inStock: Number(e.target.value) })}
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
                placeholder="Ghi chú thêm về vật liệu, kích thước..."
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
            disabled={createMutation.isPending}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu sản phẩm
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog
        open={Boolean(editProduct)}
        onClose={() => setEditProduct(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Cập nhật sản phẩm: {editProduct?.sku}
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
                TÊN SẢN PHẨM *
              </Typography>
              <TextField
                fullWidth
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GIÁ GỐC (VND)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={editForm.basePrice}
                onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                BÁN LẺ (VND)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={editForm.priceRetail || 0}
                onChange={(e) => setEditForm({ ...editForm, priceRetail: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                BÁN SỈ (VND)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={editForm.priceWholesale || 0}
                onChange={(e) => setEditForm({ ...editForm, priceWholesale: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TRẠNG THÁI
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
          <Button onClick={() => setEditProduct(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => editProduct && updateMutation.mutate({ id: editProduct.id, req: editForm })}
            variant="contained"
            disabled={updateMutation.isPending}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>

      {/* STOCK ADJUSTMENT DIALOG */}
      <Dialog
        open={Boolean(adjustProductTarget)}
        onClose={() => setAdjustProductTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Điều chỉnh tồn kho: {adjustProductTarget?.sku}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 2, color: '#404040' }}>
            Tồn hiện tại: <strong>{adjustProductTarget?.inStock}</strong> sản phẩm.
          </Typography>

          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
            SỐ LƯỢNG THAY ĐỔI (DELTA) *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={adjustForm.delta}
            onChange={(e) => setAdjustForm({ ...adjustForm, delta: Number(e.target.value) })}
            placeholder="Dương (+) để nhập thêm, Âm (-) để trừ tồn"
            helperText="Nhập 10 để thêm 10 sp, nhập -5 để trừ 5 sp"
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
            LÝ DO ĐIỀU CHỈNH
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
            placeholder="vd: Hàng hỏng kiểm kê, nhập bổ sung từ xưởng..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdjustProductTarget(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() =>
              adjustProductTarget &&
              adjustMutation.mutate({
                id: adjustProductTarget.id,
                delta: adjustForm.delta,
                reason: adjustForm.reason,
              })
            }
            variant="contained"
            disabled={adjustMutation.isPending}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu tồn kho
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
