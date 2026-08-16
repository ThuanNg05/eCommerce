import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
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
  Autocomplete,
} from '@mui/material'
import {
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Edit3,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  X,
} from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchInventory,
  createProduct,
  updateProduct,
  adjustStock,
  uploadProductImage,
  deleteProductImage,
  type ProductDto,
  type CreateProductRequest,
  type UpdateProductRequest,
} from '../api/inventory'
import { fetchCategories, type CategoryDto } from '../api/categories'
import { resolveApiUrl } from '../api/client'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

// Client-side image validation constants
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.svg', '.webp']
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/webp',
]
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

function validateImageFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
  const isTypeAllowed =
    ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_IMAGE_EXTENSIONS.includes(ext)
  if (!isTypeAllowed) {
    return 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG, GIF, BMP, TIFF, SVG hoặc WebP.'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Kích thước file ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhỏ hơn.'
  }
  return null
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductDto | null>(null)
  const [adjustProductTarget, setAdjustProductTarget] = useState<ProductDto | null>(null)

  // Image Preview Modal State (Xem ảnh phóng to)
  const [previewModal, setPreviewModal] = useState<{
    open: boolean
    url: string
    title: string
  }>({
    open: false,
    url: '',
    title: '',
  })

  // File Input Refs
  const createFileInputRef = useRef<HTMLInputElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)

  // Image states for Create Dialog
  const [createImageFile, setCreateImageFile] = useState<File | null>(null)
  const [createPreviewUrl, setCreatePreviewUrl] = useState<string | null>(null)
  const [createImageError, setCreateImageError] = useState<string | null>(null)

  // Image states for Edit Dialog
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null)
  const [hasRemovedEditImage, setHasRemovedEditImage] = useState(false)
  const [editImageError, setEditImageError] = useState<string | null>(null)

  // Submitting States
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [pageNotification, setPageNotification] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

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
    warningStock: 0,
    categoryIds: [],
  })

  const [editForm, setEditForm] = useState<UpdateProductRequest>({
    name: '',
    description: '',
    basePrice: 0,
    priceRetail: 0,
    priceWholesale: 0,
    subBackboardId: null,
    warningStock: 0,
    status: 1,
    categoryIds: [],
  })

  const [adjustForm, setAdjustForm] = useState({
    delta: 0,
    reason: '',
  })

  const [actionError, setActionError] = useState<string | null>(null)

  // Clean up object URLs when unmounting
  useEffect(() => {
    return () => {
      if (createPreviewUrl) URL.revokeObjectURL(createPreviewUrl)
      if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    }
  }, [createPreviewUrl, editPreviewUrl])

  // Query Data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => fetchInventory(search),
  })

  // Query Categories List for Multi-Select
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories('', 1, 500),
  })
  const allCategories = categoriesData?.items ?? []

  // Adjust Mutation
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
      warningStock: 0,
      categoryIds: [],
    })
    if (createPreviewUrl) {
      URL.revokeObjectURL(createPreviewUrl)
    }
    setCreateImageFile(null)
    setCreatePreviewUrl(null)
    setCreateImageError(null)
    if (createFileInputRef.current) {
      createFileInputRef.current.value = ''
    }
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
      warningStock: p.warningStock || 0,
      status: p.status,
      categoryIds: p.categories ? p.categories.map((c) => c.id) : [],
    })
    if (editPreviewUrl) {
      URL.revokeObjectURL(editPreviewUrl)
    }
    setEditImageFile(null)
    setEditPreviewUrl(null)
    setHasRemovedEditImage(false)
    setEditImageError(null)
    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
    setActionError(null)
  }

  const handleOpenAdjust = (p: ProductDto) => {
    setAdjustProductTarget(p)
    setAdjustForm({ delta: 0, reason: '' })
    setActionError(null)
  }

  // Image Upload Handlers for Create Form
  const handleCreateImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      setCreateImageError(validationError)
      if (createFileInputRef.current) {
        createFileInputRef.current.value = ''
      }
      return
    }

    setCreateImageError(null)
    if (createPreviewUrl) {
      URL.revokeObjectURL(createPreviewUrl)
    }
    setCreateImageFile(file)
    setCreatePreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveCreateImage = () => {
    if (createPreviewUrl) {
      URL.revokeObjectURL(createPreviewUrl)
    }
    setCreateImageFile(null)
    setCreatePreviewUrl(null)
    setCreateImageError(null)
    if (createFileInputRef.current) {
      createFileInputRef.current.value = ''
    }
  }

  // Image Upload Handlers for Edit Form
  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      setEditImageError(validationError)
      if (editFileInputRef.current) {
        editFileInputRef.current.value = ''
      }
      return
    }

    setEditImageError(null)
    if (editPreviewUrl) {
      URL.revokeObjectURL(editPreviewUrl)
    }
    setEditImageFile(file)
    setEditPreviewUrl(URL.createObjectURL(file))
    setHasRemovedEditImage(false)
  }

  const handleRemoveEditImage = () => {
    if (editPreviewUrl) {
      URL.revokeObjectURL(editPreviewUrl)
    }
    setEditImageFile(null)
    setEditPreviewUrl(null)
    setHasRemovedEditImage(true)
    setEditImageError(null)
    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
  }

  // Submission handler for Create Product
  const handleCreateSubmit = async () => {
    setActionError(null)
    if (!createForm.sku.trim()) {
      setActionError('Mã SKU là bắt buộc.')
      return
    }
    if (!createForm.name.trim()) {
      setActionError('Tên sản phẩm là bắt buộc.')
      return
    }

    setIsSavingCreate(true)
    try {
      const createdProduct = await createProduct(createForm)

      if (createImageFile) {
        try {
          await uploadProductImage(createdProduct.id, createImageFile)
        } catch (imgErr) {
          queryClient.invalidateQueries({ queryKey: ['inventory'] })
          setIsCreateOpen(false)
          resetCreateForm()
          setPageNotification({
            type: 'warning',
            message: `Sản phẩm "${createdProduct.name}" (SKU: ${createdProduct.sku}) đã được tạo, nhưng tải ảnh lên thất bại: ${(imgErr as Error).message}. Bạn có thể chỉnh sửa sản phẩm để thử tải lại ảnh.`,
          })
          return
        }
      }

      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setIsCreateOpen(false)
      resetCreateForm()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setIsSavingCreate(false)
    }
  }

  // Submission handler for Edit Product
  const handleEditSubmit = async () => {
    if (!editProduct) return
    setActionError(null)
    if (!editForm.name.trim()) {
      setActionError('Tên sản phẩm là bắt buộc.')
      return
    }

    setIsSavingEdit(true)
    try {
      await updateProduct(editProduct.id, editForm)

      if (editImageFile) {
        await uploadProductImage(editProduct.id, editImageFile)
      } else if (hasRemovedEditImage && editProduct.imageUrl) {
        await deleteProductImage(editProduct.id)
      }

      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      if (editPreviewUrl) {
        URL.revokeObjectURL(editPreviewUrl)
      }
      setEditProduct(null)
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setActionError((err as Error).message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Determine which image to show in Edit dialog
  const editDisplayImage = useMemo(() => {
    if (editPreviewUrl && editImageFile) {
      return {
        url: editPreviewUrl,
        label: editImageFile.name,
        subLabel: `${(editImageFile.size / 1024).toFixed(1)} KB (Chưa lưu)`,
      }
    }
    if (!hasRemovedEditImage && editProduct?.imageUrl) {
      return {
        url: resolveApiUrl(editProduct.imageUrl),
        label: 'Ảnh sản phẩm hiện tại',
        subLabel: 'Đã lưu trên hệ thống',
      }
    }
    return null
  }, [editPreviewUrl, editImageFile, hasRemovedEditImage, editProduct])

  const columns = useMemo<ColDef[]>(
    () => [
      {
        field: 'imageUrl',
        headerName: 'HÌNH ẢNH',
        width: 110,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data?: ProductDto }) => {
          const rawUrl = p.data?.imageUrl
          const resolvedUrl = rawUrl ? resolveApiUrl(rawUrl) : null
          if (!resolvedUrl) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Typography variant="caption" sx={{ color: '#a3a3a3', fontSize: 12 }}>
                  Chưa có ảnh
                </Typography>
              </Box>
            )
          }
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Nhấn để xem ảnh lớn">
                <Box
                  component="button"
                  type="button"
                  onClick={() =>
                    setPreviewModal({
                      open: true,
                      url: resolvedUrl,
                      title: p.data?.name || 'Ảnh sản phẩm',
                    })
                  }
                  aria-label={`Xem ảnh sản phẩm ${p.data?.name || ''}`}
                  sx={{
                    width: 36,
                    height: 36,
                    p: 0,
                    border: '1px solid #ededed',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    bgcolor: '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color 140ms ease',
                    '&:hover': { borderColor: '#7299ED' },
                    '&:focus-visible': {
                      outline: '2px solid rgba(114, 153, 237, 0.40)',
                      borderColor: '#7299ED',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={resolvedUrl}
                    alt={p.data?.name || 'Ảnh sản phẩm'}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              </Tooltip>
            </Box>
          )
        },
      },
      {
        field: 'name',
        headerName: 'TÊN SẢN PHẨM',
        flex: 1,
        minWidth: 200,
        filter: true,
        sortable: true,
      },
      {
        field: 'categories',
        headerName: 'DANH MỤC',
        width: 180,
        sortable: false,
        cellRenderer: (p: { data?: ProductDto }) => {
          if (!p.data?.categories || p.data.categories.length === 0) {
            return <span style={{ color: '#a3a3a3', fontSize: 13 }}>—</span>
          }
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
              {p.data.categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  size="small"
                  sx={{ bgcolor: '#f5f5f5', color: '#404040', fontSize: 11, height: 22 }}
                />
              ))}
            </Box>
          )
        },
      },
      {
        field: 'basePrice',
        headerName: 'GIÁ GỐC',
        type: 'rightAligned',
        width: 120,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number>) => formatVND(p.value),
      },
      {
        field: 'priceRetail',
        headerName: 'BÁN LẺ',
        type: 'rightAligned',
        width: 120,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number | null>) => formatVND(p.value),
      },
      {
        field: 'priceWholesale',
        headerName: 'BÁN SỈ',
        type: 'rightAligned',
        width: 120,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number | null>) => formatVND(p.value),
      },
      {
        field: 'inStock',
        headerName: 'TỒN KHO',
        type: 'rightAligned',
        width: 120,
        sortable: true,
      },
      {
        field: 'warningStock',
        headerName: 'TỐI THIỂU',
        type: 'rightAligned',
        width: 125,
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
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
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
            </Box>
          )
        },
      },
      {
        headerName: 'THAO TÁC',
        width: 140,
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
      {/* Page notification alert */}
      {pageNotification && (
        <Alert
          severity={pageNotification.type}
          onClose={() => setPageNotification(null)}
          sx={{ mb: 2, borderRadius: '6px' }}
        >
          {pageNotification.message}
        </Alert>
      )}

      {/* Action Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Danh sách Sản phẩm
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Quản lý hình ảnh, tồn kho, ngưỡng cảnh báo &amp; định giá bán lẻ / bán sỉ sản phẩm khung tranh.
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
            Thêm mới
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
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
            rowClassRules={{
              'ag-row-warning-stock': (params) =>
                Boolean(params.data && params.data.inStock <= (params.data.warningStock ?? 0)),
            }}
            loading={isLoading}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu sản phẩm</span>'
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
        onClose={() => !isSavingCreate && setIsCreateOpen(false)}
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
                disabled={isSavingCreate}
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
                disabled={isSavingCreate}
              />
            </Grid>

            {/* Mục ẢNH SẢN PHẨM trong Create Dialog */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                ẢNH SẢN PHẨM
              </Typography>
              <input
                type="file"
                ref={createFileInputRef}
                accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.svg,.webp,image/*"
                onChange={handleCreateImageSelect}
                style={{ display: 'none' }}
                id="create-product-file-input"
              />

              {createImageError && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: '6px', fontSize: 12 }}>
                  {createImageError}
                </Alert>
              )}

              {createPreviewUrl && createImageFile ? (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid #ededed',
                    borderRadius: '6px',
                    bgcolor: '#f9f9f9',
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid #e0e0e0',
                      bgcolor: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={createPreviewUrl}
                      alt="Xem trước ảnh tải lên"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: '#171717',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {createImageFile.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                      {(createImageFile.size / 1024).toFixed(1)} KB (Chưa lưu)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => createFileInputRef.current?.click()}
                        startIcon={<Upload size={13} />}
                        disabled={isSavingCreate}
                        sx={{
                          height: 28,
                          fontSize: 12,
                          borderColor: '#e0e0e0',
                          color: '#171717',
                          '&:hover': { bgcolor: '#f2f2f2' },
                        }}
                      >
                        Thay ảnh
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setPreviewModal({
                            open: true,
                            url: createPreviewUrl,
                            title: createForm.name || 'Ảnh sản phẩm',
                          })
                        }
                        startIcon={<Eye size={13} />}
                        sx={{
                          height: 28,
                          fontSize: 12,
                          borderColor: '#e0e0e0',
                          color: '#171717',
                          '&:hover': { bgcolor: '#f2f2f2' },
                        }}
                      >
                        Xem
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleRemoveCreateImage}
                        startIcon={<Trash2 size={13} />}
                        disabled={isSavingCreate}
                        sx={{
                          height: 28,
                          fontSize: 12,
                          borderColor: '#fecaca',
                          color: '#b91c1c',
                          '&:hover': { bgcolor: '#fef2f2' },
                        }}
                      >
                        Xóa
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: '1px dashed #e0e0e0',
                    borderRadius: '6px',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                  }}
                >
                  <ImageIcon size={24} color="#a3a3a3" />
                  <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
                    Chưa có ảnh sản phẩm
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#a3a3a3', fontSize: 11, textAlign: 'center' }}>
                    Hỗ trợ JPG, PNG, GIF, BMP, TIFF, SVG, WebP (Tối đa 5MB)
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => createFileInputRef.current?.click()}
                    startIcon={<Upload size={14} />}
                    disabled={isSavingCreate}
                    sx={{
                      mt: 1,
                      height: 30,
                      fontSize: 12,
                      borderColor: '#e0e0e0',
                      color: '#171717',
                      '&:hover': { bgcolor: '#f2f2f2' },
                    }}
                  >
                    Tải ảnh lên
                  </Button>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                DANH MỤC SẢN PHẨM
              </Typography>
              <Autocomplete<CategoryDto, true>
                multiple
                options={allCategories}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={allCategories.filter((c) => createForm.categoryIds?.includes(c.id))}
                onChange={(_, newValue) => {
                  setCreateForm({
                    ...createForm,
                    categoryIds: newValue.map((c) => c.id),
                  })
                }}
                disabled={isSavingCreate}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Chọn danh mục..."
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const tagProps = getTagProps({ index })
                    return (
                      <Chip
                        label={option.name}
                        size="small"
                        {...tagProps}
                        key={option.id}
                      />
                    )
                  })
                }
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
                disabled={isSavingCreate}
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
                disabled={isSavingCreate}
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
                disabled={isSavingCreate}
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
                disabled={isSavingCreate}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỒN CẢNH BÁO
              </Typography>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                value={createForm.warningStock}
                onChange={(e) => setCreateForm({ ...createForm, warningStock: Math.max(0, Number(e.target.value)) })}
                placeholder="Mặc định: 0"
                disabled={isSavingCreate}
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
                disabled={isSavingCreate}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} variant="outlined" color="inherit" disabled={isSavingCreate}>
            Hủy
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={isSavingCreate}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            {isSavingCreate ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog
        open={Boolean(editProduct)}
        onClose={() => !isSavingEdit && setEditProduct(null)}
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
                disabled={isSavingEdit}
              />
            </Grid>

            {/* Mục ẢNH SẢN PHẨM trong Edit Dialog */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                ẢNH SẢN PHẨM
              </Typography>
              <input
                type="file"
                ref={editFileInputRef}
                accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.svg,.webp,image/*"
                onChange={handleEditImageSelect}
                style={{ display: 'none' }}
                id="edit-product-file-input"
              />

              {editImageError && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: '6px', fontSize: 12 }}>
                  {editImageError}
                </Alert>
              )}

              {editDisplayImage ? (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid #ededed',
                    borderRadius: '6px',
                    bgcolor: '#f9f9f9',
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid #e0e0e0',
                      bgcolor: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={editDisplayImage.url}
                      alt="Ảnh sản phẩm"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: '#171717',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {editDisplayImage.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                      {editDisplayImage.subLabel}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => editFileInputRef.current?.click()}
                        startIcon={<Upload size={13} />}
                        disabled={isSavingEdit}
                        sx={{
                          height: 28,
                          fontSize: 12,
                          borderColor: '#e0e0e0',
                          color: '#171717',
                          '&:hover': { bgcolor: '#f2f2f2' },
                        }}
                      >
                        Thay ảnh
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setPreviewModal({
                            open: true,
                            url: editDisplayImage.url,
                            title: editForm.name || 'Ảnh sản phẩm',
                          })
                        }
                        startIcon={<Eye size={13} />}
                        sx={{
                          height: 28,
                          fontSize: 12,
                          borderColor: '#e0e0e0',
                          color: '#171717',
                          '&:hover': { bgcolor: '#f2f2f2' },
                        }}
                      >
                        Xem
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleRemoveEditImage}
                        startIcon={<Trash2 size={13} />}
                        disabled={isSavingEdit}
                        sx={{
                          height: 28,
                          fontSize: 12,
                          borderColor: '#fecaca',
                          color: '#b91c1c',
                          '&:hover': { bgcolor: '#fef2f2' },
                        }}
                      >
                        Xóa
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: '1px dashed #e0e0e0',
                    borderRadius: '6px',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                  }}
                >
                  <ImageIcon size={24} color="#a3a3a3" />
                  <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
                    Chưa có ảnh sản phẩm
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#a3a3a3', fontSize: 11, textAlign: 'center' }}>
                    Hỗ trợ JPG, PNG, GIF, BMP, TIFF, SVG, WebP (Tối đa 5MB)
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => editFileInputRef.current?.click()}
                    startIcon={<Upload size={14} />}
                    disabled={isSavingEdit}
                    sx={{
                      mt: 1,
                      height: 30,
                      fontSize: 12,
                      borderColor: '#e0e0e0',
                      color: '#171717',
                      '&:hover': { bgcolor: '#f2f2f2' },
                    }}
                  >
                    Tải ảnh lên
                  </Button>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                DANH MỤC SẢN PHẨM
              </Typography>
              <Autocomplete<CategoryDto, true>
                multiple
                options={allCategories}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={allCategories.filter((c) => editForm.categoryIds?.includes(c.id))}
                onChange={(_, newValue) => {
                  setEditForm({
                    ...editForm,
                    categoryIds: newValue.map((c) => c.id),
                  })
                }}
                disabled={isSavingEdit}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Chọn danh mục..."
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const tagProps = getTagProps({ index })
                    return (
                      <Chip
                        label={option.name}
                        size="small"
                        {...tagProps}
                        key={option.id}
                      />
                    )
                  })
                }
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
                disabled={isSavingEdit}
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
                disabled={isSavingEdit}
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
                disabled={isSavingEdit}
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TỐI THIỂU
              </Typography>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                value={editForm.warningStock}
                onChange={(e) => setEditForm({ ...editForm, warningStock: Math.max(0, Number(e.target.value)) })}
                disabled={isSavingEdit}
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
                disabled={isSavingEdit}
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
                disabled={isSavingEdit}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditProduct(null)} variant="outlined" color="inherit" disabled={isSavingEdit}>
            Hủy
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isSavingEdit}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            {isSavingEdit ? 'Đang lưu...' : 'Cập nhật'}
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
            Tồn hiện tại: <strong>{adjustProductTarget?.inStock}</strong> sản phẩm (Ngưỡng cảnh báo: {adjustProductTarget?.warningStock ?? 0}).
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
            {adjustMutation.isPending ? 'Đang lưu...' : 'Lưu tồn kho'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMAGE PREVIEW MODAL (Xem ảnh lớn) */}
      <Dialog
        open={previewModal.open}
        onClose={() => setPreviewModal({ open: false, url: '', title: '' })}
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '8px',
            p: 1,
            bgcolor: '#ffffff',
            border: '1px solid #ededed',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pr: 1,
            py: 1.5,
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: 16,
              color: '#171717',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '85%',
            }}
          >
            {previewModal.title || 'Xem ảnh sản phẩm'}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setPreviewModal({ open: false, url: '', title: '' })}
            aria-label="Đóng xem ảnh"
            sx={{ color: '#737373', '&:hover': { bgcolor: '#f2f2f2' } }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
            bgcolor: '#f9f9f9',
            borderRadius: '6px',
            m: 1,
            minHeight: 200,
          }}
        >
          {previewModal.url && (
            <Box
              component="img"
              src={previewModal.url}
              alt={previewModal.title || 'Ảnh sản phẩm'}
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button
            onClick={() => setPreviewModal({ open: false, url: '', title: '' })}
            variant="outlined"
            sx={{
              height: 36,
              borderColor: '#e0e0e0',
              color: '#171717',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
