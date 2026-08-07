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
  type InventoryTransactionDto,
  type TransactionLineDto,
  type CreateInventoryTransactionRequest,
} from '../api/inventoryTransactions'
import { fetchInventory, type ProductDto } from '../api/inventory'
import { fetchMaterials, type MaterialDto } from '../api/materials'
import { fetchBackboards, type BackboardDto } from '../api/backboards'
import { fetchSubBackboards, type SubBackboardDto } from '../api/subBackboards'

type ItemType = 'product' | 'material' | 'backboard' | 'subBackboard'

interface CreateLineState {
  itemType: ItemType
  selectedItem: ProductDto | MaterialDto | BackboardDto | SubBackboardDto | null
  quantity: number | ''
  unitPrice: number | ''
}

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('vi-VN')
  } catch {
    return dateStr
  }
}

export default function InventoryTransactionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form States for Create Transaction
  const [txType, setTxType] = useState<1 | 2>(1) // 1 = Nhập kho, 2 = Xuất kho
  const [txNote, setTxNote] = useState<string>('')
  const [createLines, setCreateLines] = useState<CreateLineState[]>([
    { itemType: 'product', selectedItem: null, quantity: 1, unitPrice: 0 },
  ])

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

  const products = productsData?.items ?? []
  const materials = materialsData?.items ?? []
  const backboards = backboardsData?.items ?? []
  const subBackboards = subBackboardsData?.items ?? []

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

  const resetCreateForm = () => {
    setTxType(1)
    setTxNote('')
    setCreateLines([{ itemType: 'product', selectedItem: null, quantity: 1, unitPrice: 0 }])
    setActionError(null)
  }

  // Add/Remove lines helper
  const handleAddLine = () => {
    setCreateLines((prev) => [
      ...prev,
      { itemType: 'product', selectedItem: null, quantity: 1, unitPrice: 0 },
    ])
  }

  const handleRemoveLine = (index: number) => {
    setCreateLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemTypeChange = (index: number, newType: ItemType) => {
    setCreateLines((prev) => {
      const updated = [...prev]
      updated[index] = {
        itemType: newType,
        selectedItem: null,
        quantity: 1,
        unitPrice: 0,
      }
      return updated
    })
  }

  const handleItemSelect = (
    index: number,
    item: ProductDto | MaterialDto | BackboardDto | SubBackboardDto | null,
  ) => {
    setCreateLines((prev) => {
      const updated = [...prev]
      const current = updated[index]
      let defaultPrice = 0

      if (item) {
        if (current.itemType === 'product') {
          const p = item as ProductDto
          defaultPrice = txType === 1 ? p.basePrice : p.priceRetail || p.basePrice
        } else if (current.itemType === 'material') {
          const m = item as MaterialDto
          defaultPrice = txType === 1 ? m.importPrice : m.salePrice || m.importPrice
        } else if (current.itemType === 'backboard') {
          const b = item as BackboardDto
          defaultPrice = txType === 1 ? b.importPrice : b.salePrice || b.importPrice
        } else if (current.itemType === 'subBackboard') {
          defaultPrice = 0
        }
      }

      updated[index] = {
        ...current,
        selectedItem: item,
        unitPrice: defaultPrice,
      }
      return updated
    })
  }

  const handleLineValueChange = (
    index: number,
    field: 'quantity' | 'unitPrice',
    val: number | '',
  ) => {
    setCreateLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: val }
      return updated
    })
  }

  const handleCreateSubmit = () => {
    setActionError(null)

    if (createLines.length === 0) {
      setActionError('Phiếu kho phải có ít nhất một dòng hàng hóa.')
      return
    }

    // Validate each line
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
        setActionError(`Dòng thứ ${i + 1}: Đơn giá không được âm.`)
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
      return b ? `[Tấm lưng] Loại ${b.type}${b.description ? ' - ' + b.description : ''}` : `Tấm lưng #${line.backboardId}`
    }
    if (line.subBackboardId) {
      const sb = subBackboards.find((x) => x.id === line.subBackboardId)
      return sb ? `[Tấm lưng phụ] Cỡ ${sb.size}` : `Tấm lưng phụ #${line.subBackboardId}`
    }
    if (line.frameId) {
      return `[Rập] #${line.frameId}`
    }
    return 'Hàng hóa chưa xác định'
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
      { field: 'transactionCode', headerName: 'MÃ PHIẾU KHO', width: 160, filter: true, sortable: true },
      {
        field: 'type',
        headerName: 'LOẠI PHIẾU',
        width: 140,
        cellRenderer: (p: { value: number }) => (
          <Chip
            label={p.value === 1 ? 'Nhập kho' : 'Xuất kho'}
            size="small"
            sx={{
              bgcolor: p.value === 1 ? '#eff6ff' : '#fff1f2',
              color: p.value === 1 ? '#1d4ed8' : '#be123c',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: '4px',
            }}
          />
        ),
      },
      {
        field: 'transactionDate',
        headerName: 'NGÀY GIAO DỊCH',
        width: 170,
        sortable: true,
        valueFormatter: (p) => formatDate(p.value),
      },
      { field: 'note', headerName: 'GHI CHÚ KHO', flex: 1, minWidth: 200 },
      {
        headerName: 'SỐ DÒNG',
        width: 110,
        type: 'rightAligned',
        valueGetter: (p) => p.data?.details?.length ?? 0,
      },
      {
        headerName: 'THAO TÁC',
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: InventoryTransactionDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Xem chi tiết phiếu kho">
                <IconButton
                  size="small"
                  onClick={() => setSelectedTxId(p.data.id)}
                  sx={{ color: '#404040' }}
                >
                  <Eye size={16} />
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
            loading={isLoading}
            quickFilterText={search}
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
                onChange={(e) => setTxType(Number(e.target.value) as 1 | 2)}
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

            {/* Chi tiết phiếu kho (Dynamic Lines) */}
            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid #ededed', pt: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
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

                {createLines.map((line, idx) => {
                  const lineTotal =
                    typeof line.quantity === 'number' && typeof line.unitPrice === 'number'
                      ? line.quantity * line.unitPrice
                      : 0

                  return (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        bgcolor: '#fafafa',
                        border: '1px solid #ededed',
                        borderRadius: '6px',
                      }}
                    >
                      <Grid container spacing={1.5} alignItems="center">
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
                              handleItemTypeChange(idx, e.target.value as ItemType)
                            }
                          >
                            <MenuItem value="product">Sản phẩm</MenuItem>
                            <MenuItem value="material">Vật liệu</MenuItem>
                            <MenuItem value="backboard">Tấm lưng</MenuItem>
                            <MenuItem value="subBackboard">Tấm lưng phụ</MenuItem>
                          </TextField>
                        </Grid>

                        <Grid item xs={9}>
                          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                            CHỌN HÀNG HÓA *
                          </Typography>
                          {line.itemType === 'product' && (
                            <Autocomplete
                              size="small"
                              options={products}
                              getOptionLabel={(p) => `[${p.sku}] ${p.name}`}
                              value={(line.selectedItem as ProductDto) || null}
                              onChange={(_, val) => handleItemSelect(idx, val)}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Tìm sản phẩm theo SKU/Tên..." />
                              )}
                            />
                          )}

                          {line.itemType === 'material' && (
                            <Autocomplete
                              size="small"
                              options={materials}
                              getOptionLabel={(m) => m.name}
                              value={(line.selectedItem as MaterialDto) || null}
                              onChange={(_, val) => handleItemSelect(idx, val)}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Tìm vật liệu..." />
                              )}
                            />
                          )}

                          {line.itemType === 'backboard' && (
                            <Autocomplete
                              size="small"
                              options={backboards}
                              getOptionLabel={(b) =>
                                `Tấm lưng (Loại ${b.type})${b.description ? ' - ' + b.description : ''}`
                              }
                              value={(line.selectedItem as BackboardDto) || null}
                              onChange={(_, val) => handleItemSelect(idx, val)}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Tìm tấm lưng..." />
                              )}
                            />
                          )}

                          {line.itemType === 'subBackboard' && (
                            <Autocomplete
                              size="small"
                              options={subBackboards}
                              getOptionLabel={(sb) =>
                                `Tấm lưng phụ ${sb.size}${sb.description ? ' - ' + sb.description : ''}`
                              }
                              value={(line.selectedItem as SubBackboardDto) || null}
                              onChange={(_, val) => handleItemSelect(idx, val)}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Tìm tấm lưng phụ..." />
                              )}
                            />
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
                                idx,
                                'quantity',
                                e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                              )
                            }
                          />
                        </Grid>

                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                            ĐƠN GIÁ (VND) *
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleLineValueChange(
                                idx,
                                'unitPrice',
                                e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                              )
                            }
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

                        <Grid item xs={1} sx={{ textCenter: 'center', pt: 2.5 }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveLine(idx)}
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

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '6px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#fafafa' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 50 }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>TÊN HÀNG HÓA / CHI TIẾT</TableCell>
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
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{getItemDisplayName(line)}</TableCell>
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
