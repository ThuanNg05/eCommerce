import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Checkbox,
  FormControlLabel,
  Snackbar,
  CircularProgress,
} from '@mui/material'
import { Plus, RefreshCw, Edit3, Globe } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  publishAndLinkWarehouseCategory,
  type CategoryDto,
} from '../api/categories'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'
import { formatDate } from '../utils/dateFormat'
import { autoSizeGridColumns, AG_GRID_AUTO_SIZE_STRATEGY } from '../utils/agGridAutoSize'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Create / Edit Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null)
  const [formName, setFormName] = useState('')
  const [syncToWebsite, setSyncToWebsite] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Link Dialog states
  const [linkCategoryTarget, setLinkCategoryTarget] = useState<CategoryDto | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Toast Notification state
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => fetchCategories(search),
  })

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: ({ name, syncToWooCommerce }: { name: string; syncToWooCommerce?: boolean }) =>
      createCategory({ name, syncToWooCommerce }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setToast({
        open: true,
        message: 'Đã thêm danh mục mới thành công.',
        severity: 'success',
      })
      handleCloseDialog()
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (syncToWebsite) {
        setFormError(
          `Danh mục có thể đã được tạo trong kho nhưng chưa liên kết lên trang web. Hãy tải lại danh sách và thử liên kết lại. (${err.message})`,
        )
      } else {
        setFormError(err.message)
      }
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setToast({
        open: true,
        message: 'Đã cập nhật danh mục thành công.',
        severity: 'success',
      })
      handleCloseDialog()
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  // Publish & Link Mutation
  const linkMutation = useMutation({
    mutationFn: (categoryId: number) => publishAndLinkWarehouseCategory(categoryId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      const targetName = linkCategoryTarget?.name ?? ''
      setToast({
        open: true,
        message: `Đã liên kết danh mục "${targetName}" lên trang web thành công (#${result.wooCommerceCategoryId}).`,
        severity: 'success',
      })
      handleCloseLinkDialog()
    },
    onError: (err: Error) => {
      setLinkError(err.message)
    },
  })

  const handleOpenCreate = () => {
    setFormName('')
    setSyncToWebsite(false)
    setFormError(null)
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (category: CategoryDto) => {
    setEditingCategory(category)
    setFormName(category.name)
    setSyncToWebsite(false)
    setFormError(null)
  }

  const handleCloseDialog = () => {
    setIsCreateOpen(false)
    setEditingCategory(null)
    setFormName('')
    setSyncToWebsite(false)
    setFormError(null)
  }

  const handleOpenLinkConfirm = (category: CategoryDto) => {
    setLinkCategoryTarget(category)
    setLinkError(null)
  }

  const handleCloseLinkDialog = () => {
    if (linkMutation.isPending) return
    setLinkCategoryTarget(null)
    setLinkError(null)
  }

  const handleConfirmLink = () => {
    if (!linkCategoryTarget) return
    linkMutation.mutate(linkCategoryTarget.id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      setFormError('Tên danh mục không được để trống.')
      return
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, name: formName.trim() })
    } else {
      createMutation.mutate({ name: formName.trim(), syncToWooCommerce: syncToWebsite })
    }
  }

  const columns = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'STT',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        minWidth: 60,
        maxWidth: 80,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
      },
      { field: 'id', headerName: 'ID', width: 90, sortable: true },
      { field: 'name', headerName: 'TÊN DANH MỤC', minWidth: 160, filter: true, sortable: true },
      {
        field: 'wooCommerceLink',
        headerName: 'TRẠNG THÁI TRANG WEB',
        width: 200,
        minWidth: 180,
        sortable: true,
        valueGetter: (p) =>
          p.data?.wooCommerceLink?.wooCommerceCategoryId
            ? `Đã liên kết (#${p.data.wooCommerceLink.wooCommerceCategoryId})`
            : 'Chưa liên kết',
        cellRenderer: (p: { data?: CategoryDto }) => {
          if (!p.data) return null
          const isLinked = Boolean(p.data.wooCommerceLink?.wooCommerceCategoryId)
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Chip
                label={
                  isLinked
                    ? `Đã liên kết (#${p.data.wooCommerceLink!.wooCommerceCategoryId})`
                    : 'Chưa liên kết'
                }
                size="small"
                sx={{
                  bgcolor: isLinked ? '#f0fdf4' : '#f3f4f6',
                  color: isLinked ? '#15803d' : '#525252',
                  fontSize: 12,
                  fontWeight: 500,
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
        width: 170,
        sortable: true,
        valueFormatter: (p) => formatDate(p.value),
      },
      {
        headerName: 'THAO TÁC',
        width: 110,
        minWidth: 100,
        maxWidth: 130,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data?: CategoryDto }) => {
          if (!p.data) return null
          const isLinked = Boolean(p.data.wooCommerceLink?.wooCommerceCategoryId)
          return (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Chỉnh sửa danh mục">
                <IconButton
                  size="small"
                  onClick={() => handleOpenEdit(p.data!)}
                  sx={{ color: '#171717', '&:hover': { bgcolor: '#f2f2f2' } }}
                  aria-label="Chỉnh sửa danh mục"
                >
                  <Edit3 size={16} />
                </IconButton>
              </Tooltip>

              {!isLinked && (
                <Tooltip title="Liên kết lên trang web">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenLinkConfirm(p.data!)}
                    sx={{ color: '#7299ED', '&:hover': { bgcolor: '#EEF3FD' } }}
                    aria-label="Liên kết lên trang web"
                  >
                    <Globe size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )
        },
      },
    ],
    [],
  )

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Box sx={{ width: '100%' }}>
      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ borderRadius: '6px', border: '1px solid #ededed' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Danh mục Sản phẩm
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Phân loại danh mục các sản phẩm khung tranh và phụ kiện.
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
            onClick={handleOpenCreate}
            startIcon={<Plus size={16} />}
            sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
          >
            Thêm mới
          </Button>
        </Box>
      </Box>

      {/* Filter / Search */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <SearchField
          placeholder="Tìm tên danh mục..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          width={320}
        />
      </Paper>

      {/* Grid Container */}
      <Paper elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', overflow: 'hidden', height: 'calc(100vh - 290px)' }}>
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<CategoryDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            autoSizeStrategy={AG_GRID_AUTO_SIZE_STRATEGY}
            onFirstDataRendered={(params) => autoSizeGridColumns(params.api)}
            onRowDataUpdated={(params) => autoSizeGridColumns(params.api)}
            loading={isLoading}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu</span>'
            pagination
          />
        </div>
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || Boolean(editingCategory)}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
            {editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục Mới'}
          </DialogTitle>

          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
                {formError}
              </Alert>
            )}

            <TextField
              autoFocus
              fullWidth
              label="Tên danh mục *"
              placeholder="VD: Khung gỗ, Kính cường lực..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            />

            {/* Checkbox when creating */}
            {!editingCategory && (
              <Box sx={{ mt: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={syncToWebsite}
                      onChange={(e) => setSyncToWebsite(e.target.checked)}
                      disabled={isSubmitting}
                      size="small"
                      sx={{
                        color: '#737373',
                        '&.Mui-checked': {
                          color: '#1a1a1a',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: 13, color: '#171717' }}>
                      Liên kết lên trang web ngay sau khi tạo
                    </Typography>
                  }
                />
              </Box>
            )}

            {/* Helper text when editing a linked category */}
            {editingCategory?.wooCommerceLink && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1.5,
                  color: '#15803d',
                  fontSize: 12,
                }}
              >
                Tên mới sẽ được đồng bộ lên trang web.
              </Typography>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseDialog} variant="outlined" color="inherit" disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
            >
              {editingCategory ? 'Cập nhật' : 'Lưu'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Link Confirmation Dialog */}
      <Dialog
        open={Boolean(linkCategoryTarget)}
        onClose={handleCloseLinkDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
          Liên kết danh mục lên trang web
        </DialogTitle>
        <DialogContent>
          {linkError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {linkError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: '#404040' }}>
            Bạn có chắc chắn muốn xuất bản và liên kết danh mục{' '}
            <strong>&ldquo;{linkCategoryTarget?.name}&rdquo;</strong> lên trang web không?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleCloseLinkDialog}
            variant="outlined"
            color="inherit"
            disabled={linkMutation.isPending}
            sx={{ borderColor: '#e0e0e0', color: '#171717' }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirmLink}
            variant="contained"
            disabled={linkMutation.isPending}
            startIcon={
              linkMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <Globe size={16} />
            }
            sx={{ bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
          >
            {linkMutation.isPending ? 'Đang liên kết...' : 'Liên kết'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

