import { useMemo, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { autoSizeGridColumns, AG_GRID_AUTO_SIZE_STRATEGY } from '../utils/agGridAutoSize'
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
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchInventoryTransactions,
  fetchInventoryTransactionById,
  createInventoryTransaction,
  createBackboardConversion,
  type InventoryTransactionDto,
  type TransactionLineDto,
  type CreateInventoryTransactionRequest,
} from '../api/inventoryTransactions'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'
import { formatDate } from '../utils/dateFormat'
import { fetchInventory, type ProductDto } from '../api/inventory'
import { fetchMaterials, type MaterialDto } from '../api/materials'
import { fetchBackboards, type BackboardDto } from '../api/backboards'
import { fetchSubBackboards, type SubBackboardDto } from '../api/subBackboards'
import { fetchFrames, type FrameDto } from '../api/frames'

type ItemType = 'product' | 'material' | 'backboard' | 'subBackboard' | 'backboardConversion'

interface CreateLineState {
  id: string
  itemType: ItemType
  selectedItem: ProductDto | MaterialDto | BackboardDto | SubBackboardDto | null
  selectedFrame?: FrameDto | null
  quantity: number | ''
  unitPrice: number | ''
}

const createEmptyLine = (): CreateLineState => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  itemType: 'product',
  selectedItem: null,
  quantity: 1,
  unitPrice: 0,
})

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)

export default function InventoryTransactionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const linesContainerRef = useRef<HTMLDivElement>(null)

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form States for Create Transaction
  const [txType, setTxType] = useState<1 | 2>(1) // 1 = Nhập kho, 2 = Xuất kho
  const [txNote, setTxNote] = useState<string>('')
  const [createLines, setCreateLines] = useState<CreateLineState[]>([createEmptyLine()])

  // Queries for Inventory & Item Options
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventoryTransactions', search],
    queryFn: () => fetchInventoryTransactions(search, 1, 500),
  })

  const { data: selectedTxDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['inventoryTransaction', selectedTxId],
    queryFn: () => fetchInventoryTransactionById(selectedTxId!),
    enabled: Boolean(selectedTxId),
  })

  const { data: productsData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: () => fetchInventory('', 1, 500),
  })

  const { data: materialsData } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: () => fetchMaterials('', 1, 500),
  })

  const { data: backboardsData } = useQuery({
    queryKey: ['backboards', 'all'],
    queryFn: () => fetchBackboards('', 1, 500),
  })

  const { data: subBackboardsData } = useQuery({
    queryKey: ['subBackboards', 'all'],
    queryFn: () => fetchSubBackboards('', 1, 500),
  })

  const { data: framesData } = useQuery({
    queryKey: ['frames', 'all'],
    queryFn: () => fetchFrames('', 1, 500),
  })

  const products = productsData?.items ?? []
  const materials = materialsData?.items ?? []
  const backboards = backboardsData?.items ?? []
  const subBackboards = subBackboardsData?.items ?? []
  const frames = framesData?.items ?? []

  // Active options for backboard conversion
  const activeBackboards = useMemo(() => backboards.filter((b) => b.status === 1), [backboards])
  const activeFrames = useMemo(() => frames.filter((f) => f.status === 1), [frames])

  const getBackboardOptionLabel = (b: BackboardDto) => {
    const typeLabel = b.type === 1 ? 'MDF' : b.type === 2 ? 'HP' : `Loại ${b.type}`
    const descLabel = b.description ? ` - ${b.description}` : ''
    return `Ván ép (${typeLabel}${descLabel}) - Tồn: ${b.inStock}`
  }

  const getFrameOptionLabel = (f: FrameDto) => {
    const codeLabel = `Mã rập: ${f.code}`
    const descLabel = f.description ? ` (${f.description})` : ''
    const linesLabel = f.lines && f.lines.length > 0 ? ` - ${f.lines.length} loại ván hậu` : ''
    return `${codeLabel}${descLabel}${linesLabel}`
  }

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createInventoryTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['backboards'] })
      queryClient.invalidateQueries({ queryKey: ['subBackboards'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  // Conversion Mutation
  const conversionMutation = useMutation({
    mutationFn: createBackboardConversion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] })
      queryClient.invalidateQueries({ queryKey: ['backboards'] })
      queryClient.invalidateQueries({ queryKey: ['subBackboards'] })
      queryClient.invalidateQueries({ queryKey: ['frames'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setTxType(1)
    setTxNote('')
    setCreateLines([createEmptyLine()])
    setActionError(null)
  }

  // Prepend line to top and scroll list container to top
  const handleAddLine = () => {
    const newLine = createEmptyLine()
    setCreateLines((prev) => [newLine, ...prev])
    setTimeout(() => {
      linesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  const handleRemoveLine = (id: string) => {
    setCreateLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleItemTypeChange = (id: string, newType: ItemType) => {
    setCreateLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              itemType: newType,
              selectedItem: null,
              selectedFrame: null,
              quantity: 1,
              unitPrice: 0,
            }
          : l,
      ),
    )
  }

  const handleFrameSelect = (id: string, frame: FrameDto | null) => {
    setCreateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selectedFrame: frame } : l)),
    )
  }

  const handleItemSelect = (
    id: string,
    item: ProductDto | MaterialDto | BackboardDto | SubBackboardDto | null,
  ) => {
    setCreateLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        let defaultPrice = 0

        if (item) {
          if (l.itemType === 'product') {
            const p = item as ProductDto
            defaultPrice = txType === 1 ? p.basePrice : p.priceRetail || p.basePrice
          } else if (l.itemType === 'material') {
            const m = item as MaterialDto
            defaultPrice = txType === 1 ? m.importPrice : m.salePrice || m.importPrice
          } else if (l.itemType === 'backboard') {
            const b = item as BackboardDto
            defaultPrice = txType === 1 ? b.importPrice : b.salePrice || b.importPrice
          } else if (l.itemType === 'subBackboard') {
            defaultPrice = 0
          }
        }

        return {
          ...l,
          selectedItem: item,
          unitPrice: defaultPrice,
        }
      }),
    )
  }

  const handleLineValueChange = (
    id: string,
    field: 'quantity',
    val: number | '',
  ) => {
    setCreateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
    )
  }

  const handleCreateSubmit = () => {
    setActionError(null)

    if (createLines.length === 0) {
      setActionError('Phiếu kho phải có ít nhất một dòng hàng hóa.')
      return
    }

    // Check if any line is Backboard Conversion
    const conversionLine = createLines.find((l) => l.itemType === 'backboardConversion')
    if (conversionLine) {
      if (txType !== 2) {
        setActionError('Loại hàng Rập ván hậu chỉ được sử dụng trong phiếu Xuất kho.')
        return
      }
      if (!conversionLine.selectedItem) {
        setActionError('Vui lòng chọn ván ép (MDF/HP) đang hoạt động.')
        return
      }
      if (!conversionLine.selectedFrame) {
        setActionError('Vui lòng chọn rập ván hậu đang hoạt động.')
        return
      }
      if (typeof conversionLine.quantity !== 'number' || conversionLine.quantity <= 0 || !Number.isInteger(conversionLine.quantity)) {
        setActionError('Số lượng tấm ván ép phải là số nguyên dương.')
        return
      }

      conversionMutation.mutate({
        backboardId: (conversionLine.selectedItem as BackboardDto).id,
        frameId: conversionLine.selectedFrame.id,
        quantity: Math.floor(Number(conversionLine.quantity)),
        note: txNote.trim() || null,
      })
      return
    }

    // Validate each standard line
    for (let i = 0; i < createLines.length; i++) {
      const line = createLines[i]
      if (!line.selectedItem) {
        setActionError(`Dòng thứ ${i + 1}: Vui lòng chọn hàng hóa.`)
        return
      }
      if (typeof line.quantity !== 'number' || line.quantity <= 0 || !Number.isInteger(line.quantity)) {
        setActionError(`Dòng thứ ${i + 1}: Số lượng phải là số nguyên dương.`)
        return
      }
      if (typeof line.unitPrice !== 'number' || line.unitPrice < 0) {
        setActionError(`Dòng thứ ${i + 1}: Đơn giá không hợp lệ.`)
        return
      }
    }

    const payload: CreateInventoryTransactionRequest = {
      type: txType,
      note: txNote.trim() || null,
      details: createLines.map((l) => ({
        productId: l.itemType === 'product' ? (l.selectedItem as ProductDto).id : null,
        materialId: l.itemType === 'material' ? (l.selectedItem as MaterialDto).id : null,
        backboardId: l.itemType === 'backboard' ? (l.selectedItem as BackboardDto).id : null,
        subBackboardId: l.itemType === 'subBackboard' ? (l.selectedItem as SubBackboardDto).id : null,
        frameId: null,
        quantity: Math.floor(Number(l.quantity)),
        unitPrice: Number(l.unitPrice),
        direction: txType,
      })),
    }

    createMutation.mutate(payload)
  }

  // Item Display Name resolver for details
  const getItemDisplayName = (line: TransactionLineDto) => {
    if (line.productId) {
      const p = products.find((x) => x.id === line.productId)
      return p ? `[Sản phẩm] ${p.name} (SKU: ${p.sku})` : `Sản phẩm #${line.productId}`
    }
    if (line.materialId) {
      const m = materials.find((x) => x.id === line.materialId)
      return m ? `[Vật liệu] ${m.name}` : `Vật liệu #${line.materialId}`
    }
    if (line.backboardId) {
      const b = backboards.find((x) => x.id === line.backboardId)
      return b ? `[Ván ép] Loại ${b.type}${b.description ? ' - ' + b.description : ''}` : `Ván ép #${line.backboardId}`
    }
    if (line.subBackboardId) {
      const sb = subBackboards.find((x) => x.id === line.subBackboardId)
      return sb ? `[Ván hậu] Cỡ ${sb.size}` : `Ván hậu #${line.subBackboardId}`
    }
    if (line.frameId) {
      const f = frames.find((x) => x.id === line.frameId)
      return f
        ? `[Rập ván hậu] Mã rập #${f.code}${f.description ? ' - ' + f.description : ''}`
        : `[Rập ván hậu] Mã rập #${line.frameId}`
    }
    return 'Hàng hóa chưa xác định'
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
      { field: 'transactionCode', headerName: 'MÃ PHIẾU KHO', width: 160, filter: true, sortable: true },
      {
        field: 'type',
        headerName: 'LOẠI PHIẾU',
        width: 140,
        cellRenderer: (p: { value: number }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Chip
              label={p.value === 1 ? 'Nhập kho' : 'Xuất kho'}
              size="small"
              sx={{
                bgcolor: p.value === 1 ? '#eff6ff' : '#fff1f2',
                color: p.value === 1 ? '#1d4ed8' : '#be123c',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: '4px',
                height: 24,
              }}
            />
          </Box>
        ),
      },
      {
        field: 'transactionDate',
        headerName: 'NGÀY',
        width: 170,
        sortable: true,
        valueFormatter: (p) => formatDate(p.value),
      },
      { field: 'note', headerName: 'GHI CHÚ KHO', minWidth: 160 },
      {
        headerName: 'SỐ DÒNG',
        width: 110,
        type: 'rightAligned',
        valueGetter: (p) => p.data?.details?.length ?? 0,
      },
      {
        headerName: 'THAO TÁC',
        width: 130,
        minWidth: 120,
        maxWidth: 140,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: InventoryTransactionDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Xem chi tiết">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedTxId(p.data.id)}
                  startIcon={<Eye size={14} />}
                  sx={{
                    height: 28,
                    fontSize: 12,
                    borderColor: '#e0e0e0',
                    color: '#171717',
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    px: 1.25,
                    '&:hover': { bgcolor: '#f2f2f2', borderColor: '#d4d4d4' },
                  }}
                >
                  Xem chi tiết
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Quản lý Kho (Nhập / Xuất)
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Tạo phiếu và theo dõi nhật ký giao dịch nhập kho, xuất kho hàng hóa.
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
            Tạo phiếu kho
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo mã phiếu kho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Hiển thị: <strong>{data?.items.length ?? 0}</strong> / Tổng số: <strong>{data?.totalCount ?? 0}</strong> phiếu kho
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể lấy dữ liệu giao dịch kho: {(error as Error).message}
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
          <AgGridReact<InventoryTransactionDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            autoSizeStrategy={AG_GRID_AUTO_SIZE_STRATEGY}
            onFirstDataRendered={(params) => autoSizeGridColumns(params.api)}
            onRowDataUpdated={(params) => autoSizeGridColumns(params.api)}
            loading={isLoading}
            quickFilterText={search}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có phiếu giao dịch kho</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
          />
        </div>
      </Paper>

      {/* CREATE TRANSACTION DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Tạo phiếu giao dịch kho mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                LOẠI PHIẾU *
              </Typography>
              <TextField
                select
                fullWidth
                value={txType}
                onChange={(e) => {
                  const newType = Number(e.target.value) as 1 | 2
                  if (newType === txType) return

                  setTxType(newType)
                  setCreateLines((prev) =>
                    prev.map((line) => {
                      if (newType === 1 && line.itemType === 'backboardConversion') {
                        return {
                          ...line,
                          itemType: 'product',
                          selectedItem: null,
                          selectedFrame: null,
                          quantity: 1,
                          unitPrice: 0,
                        }
                      }

                      let defaultPrice = line.unitPrice
                      if (line.selectedItem) {
                        if (line.itemType === 'product') {
                          const p = line.selectedItem as ProductDto
                          defaultPrice = newType === 1 ? p.basePrice : p.priceRetail || p.basePrice
                        } else if (line.itemType === 'material') {
                          const m = line.selectedItem as MaterialDto
                          defaultPrice = newType === 1 ? m.importPrice : m.salePrice || m.importPrice
                        } else if (line.itemType === 'backboard') {
                          const b = line.selectedItem as BackboardDto
                          defaultPrice = newType === 1 ? b.importPrice : b.salePrice || b.importPrice
                        }
                      }

                      return {
                        ...line,
                        quantity: 1,
                        unitPrice: defaultPrice,
                      }
                    }),
                  )
                }}
              >
                <MenuItem value={1}>Nhập kho (+)</MenuItem>
                <MenuItem value={2}>Xuất kho (-)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={8}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                GHI CHÚ KHO
              </Typography>
              <TextField
                fullWidth
                placeholder="Nhập ghi chú giao dịch..."
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
              />
            </Grid>

            {/* Chi tiết phiếu kho Section */}
            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid #ededed', pt: 2, mt: 1 }}>
                {/* Sticky Header / Toolbar */}
                <Box
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    bgcolor: '#ffffff',
                    pt: 0.5,
                    pb: 1.5,
                    borderBottom: '1px solid #ededed',
                    mb: 1.5,
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                      Chi tiết phiếu kho ({txType === 1 ? 'Nhập kho' : 'Xuất kho'})
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#737373' }}>
                      Chọn hàng hóa, số lượng và đơn giá cho từng dòng giao dịch
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Plus size={14} />}
                    onClick={handleAddLine}
                    sx={{ color: '#171717', borderColor: '#e0e0e0' }}
                    variant="outlined"
                  >
                    Thêm dòng
                  </Button>
                </Box>

                {/* Scrollable Container for Line Cards */}
                <Box
                  ref={linesContainerRef}
                  sx={{
                    maxHeight: 'min(48vh, 460px)',
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  {createLines.map((line) => {
                    const lineTotal =
                      typeof line.quantity === 'number' && typeof line.unitPrice === 'number'
                        ? line.quantity * line.unitPrice
                        : 0

                    return (
                      <Paper
                        key={line.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          bgcolor: '#fafafa',
                          border: '1px solid #ededed',
                          borderRadius: '6px',
                        }}
                      >
                        <Grid container spacing={1.5} alignItems="flex-start">
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                              LOẠI HÀNG *
                            </Typography>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={line.itemType}
                              onChange={(e) =>
                                handleItemTypeChange(line.id, e.target.value as ItemType)
                              }
                            >
                              <MenuItem value="product">Sản phẩm</MenuItem>
                              <MenuItem value="material">Vật liệu</MenuItem>
                              <MenuItem value="backboard">Ván ép</MenuItem>
                              <MenuItem value="subBackboard">Ván hậu</MenuItem>
                              {txType === 2 && (
                                <MenuItem value="backboardConversion">Rập ván hậu</MenuItem>
                              )}
                            </TextField>
                          </Grid>

                          <Grid item xs={9}>
                            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                              {line.itemType === 'backboardConversion' ? 'THÔNG TIN QUY ĐỔI (VÁN ÉP & RẬP VÁN HẬU) *' : 'CHỌN HÀNG HÓA *'}
                            </Typography>
                            {line.itemType === 'product' && (
                              <Autocomplete
                                size="small"
                                options={products}
                                getOptionLabel={(p) => `[${p.sku}] ${p.name}`}
                                value={(line.selectedItem as ProductDto) || null}
                                onChange={(_, val) => handleItemSelect(line.id, val)}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Tìm sản phẩm theo SKU/Tên..." />
                                )}
                              />
                            )}

                            {line.itemType === 'material' && (
                              <Autocomplete
                                size="small"
                                options={materials}
                                getOptionLabel={(m) => `${m.name}${m.unit ? ` (${m.unit})` : ''}`}
                                value={(line.selectedItem as MaterialDto) || null}
                                onChange={(_, val) => handleItemSelect(line.id, val)}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Tìm vật liệu..." />
                                )}
                              />
                            )}

                            {line.itemType === 'backboard' && (
                              <Autocomplete
                                size="small"
                                options={backboards}
                                getOptionLabel={getBackboardOptionLabel}
                                value={(line.selectedItem as BackboardDto) || null}
                                onChange={(_, val) => handleItemSelect(line.id, val)}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Tìm ván ép..." />
                                )}
                              />
                            )}

                            {line.itemType === 'subBackboard' && (
                              <Autocomplete
                                size="small"
                                options={subBackboards}
                                getOptionLabel={(sb) =>
                                  `Ván hậu ${sb.size}${sb.description ? ' - ' + sb.description : ''}`
                                }
                                value={(line.selectedItem as SubBackboardDto) || null}
                                onChange={(_, val) => handleItemSelect(line.id, val)}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Tìm ván hậu..." />
                                )}
                              />
                            )}

                            {line.itemType === 'backboardConversion' && (
                              <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                  <Autocomplete
                                    size="small"
                                    options={activeBackboards}
                                    getOptionLabel={getBackboardOptionLabel}
                                    value={(line.selectedItem as BackboardDto) || null}
                                    onChange={(_, val) => handleItemSelect(line.id, val)}
                                    renderInput={(params) => (
                                      <TextField {...params} label="Ván ép (MDF/HP) *" placeholder="Chọn ván ép hoạt động..." />
                                    )}
                                  />
                                </Grid>
                                <Grid item xs={6}>
                                  <Autocomplete
                                    size="small"
                                    options={activeFrames}
                                    getOptionLabel={getFrameOptionLabel}
                                    value={line.selectedFrame || null}
                                    onChange={(_, val) => handleFrameSelect(line.id, val)}
                                    renderInput={(params) => (
                                      <TextField {...params} label="Rập ván hậu *" placeholder="Chọn theo Mã Rập..." />
                                    )}
                                  />
                                </Grid>
                              </Grid>
                            )}
                          </Grid>

                          <Grid item xs={3.5}>
                            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                              SỐ LƯỢNG *
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              inputProps={{ min: 1 }}
                              value={line.quantity}
                              onChange={(e) =>
                                handleLineValueChange(
                                  line.id,
                                  'quantity',
                                  e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                                )
                              }
                            />
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                              ĐƠN GIÁ (VND)
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={line.unitPrice}
                              InputProps={{ readOnly: true }}
                              helperText="Đơn giá được lấy tự động từ hàng hóa đã chọn."
                              FormHelperTextProps={{ sx: { fontSize: 11, color: '#737373', mx: 0, mt: 0.5 } }}
                              sx={{ bgcolor: '#f5f5f5' }}
                            />
                          </Grid>

                          <Grid item xs={3.5}>
                            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                              THÀNH TIỀN (XEM TRƯỚC)
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={formatVND(lineTotal)}
                              InputProps={{ readOnly: true }}
                              sx={{ bgcolor: '#f5f5f5' }}
                            />
                          </Grid>

                          <Grid item xs={1} sx={{ textAlign: 'center', pt: 2.5 }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveLine(line.id)}
                              disabled={createLines.length <= 1}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    )
                  })}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={createMutation.isPending}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu phiếu kho
          </Button>
        </DialogActions>
      </Dialog>

      {/* DETAIL TRANSACTION DIALOG */}
      <Dialog
        open={Boolean(selectedTxId)}
        onClose={() => setSelectedTxId(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Chi tiết phiếu kho: #{selectedTxDetail?.transactionCode ?? selectedTxId}
        </DialogTitle>
        <DialogContent>
          {isLoadingDetail ? (
            <Typography variant="body2" sx={{ color: '#737373', py: 3, textAlign: 'center' }}>
              Đang tải chi tiết phiếu...
            </Typography>
          ) : selectedTxDetail ? (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                    LOẠI PHIẾU
                  </Typography>
                  <Chip
                    label={selectedTxDetail.type === 1 ? 'Nhập kho' : 'Xuất kho'}
                    size="small"
                    sx={{
                      bgcolor: selectedTxDetail.type === 1 ? '#eff6ff' : '#fff1f2',
                      color: selectedTxDetail.type === 1 ? '#1d4ed8' : '#be123c',
                      fontWeight: 600,
                      fontSize: 12,
                      mt: 0.5,
                    }}
                  />
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                    NGÀY PHIẾU
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {formatDate(selectedTxDetail.transactionDate || selectedTxDetail.createdAt)}
                  </Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                    GHI CHÚ
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {selectedTxDetail.note || 'Không có ghi chú'}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717', mb: 1 }}>
                Danh sách dòng hàng hóa giao dịch ({selectedTxDetail.details?.length ?? 0} dòng)
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '6px', overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#fafafa' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 50, position: 'sticky', left: 0, zIndex: 4, bgcolor: '#fafafa' }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 600, position: 'sticky', left: 50, zIndex: 4, bgcolor: '#fafafa', borderRight: '1px solid #ededed', minWidth: 160 }}>TÊN HÀNG HÓA / CHI TIẾT</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>HƯỚNG</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, width: 90 }}>SỐ LƯỢNG</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, width: 130 }}>ĐƠN GIÁ</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, width: 140 }}>THÀNH TIỀN</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTxDetail.details && selectedTxDetail.details.length > 0 ? (
                      selectedTxDetail.details.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#ffffff' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 50, zIndex: 2, bgcolor: '#ffffff', borderRight: '1px solid #ededed' }}>{getItemDisplayName(line)}</TableCell>
                          <TableCell>
                            <Chip
                              label={line.direction === 1 ? 'Nhập' : 'Xuất'}
                              size="small"
                              sx={{
                                bgcolor: line.direction === 1 ? '#f0fdf4' : '#fffbeb',
                                color: line.direction === 1 ? '#166534' : '#b45309',
                                fontSize: 11,
                                height: 20,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">{line.quantity}</TableCell>
                          <TableCell align="right">{formatVND(line.unitPrice)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatVND(line.totalPrice ?? line.quantity * line.unitPrice)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ color: '#737373', py: 2 }}>
                          Không có thông tin chi tiết dòng hàng hóa.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedTxId(null)} variant="outlined" color="inherit">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
