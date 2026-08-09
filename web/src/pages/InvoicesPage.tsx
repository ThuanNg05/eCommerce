import { useMemo, useState, useRef, useEffect } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Autocomplete,
  Snackbar,
} from '@mui/material'
import { Plus, RefreshCw, Printer, Eye, Trash2, Edit } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  updateInvoiceLines,
  type InvoiceSummaryDto,
  type CreateInvoiceRequest,
  type CreateInvoiceLineRequest,
} from '../api/invoices'
import { fetchInventory, type ProductDto } from '../api/inventory'
import { fetchCustomers, fetchCustomerById, type CustomerDto } from '../api/customers'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'
import { STORE_INFO } from '../constants/storeInfo'
import { QRCodeSVG } from 'qrcode.react'

interface CreateInvoiceLineState {
  id: string
  entryTimestamp: number
  selectedProduct: ProductDto | null
  productSearchTerm: string
  quantity: number
  unitPrice: number
  description: string
  isPriceManuallyEdited: boolean
}

const createEmptyInvoiceLine = (): CreateInvoiceLineState => ({
  id: `inv-line-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  entryTimestamp: Date.now(),
  selectedProduct: null,
  productSearchTerm: '',
  quantity: 1,
  unitPrice: 0,
  description: '',
  isPriceManuallyEdited: false,
})

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDateDDMMYYYY = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const isInvoiceEditable = (createdAtStr?: string | null): boolean => {
  if (!createdAtStr) return false
  const createdDate = new Date(createdAtStr)
  if (isNaN(createdDate.getTime())) return false

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const formattedDateStr = formatter.format(createdDate)
  const [yearStr, monthStr, dayStr] = formattedDateStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)

  const deadlineVn = new Date(Date.UTC(year, month, day + 3, 0, 0, 0, 0) - 7 * 3600 * 1000)

  return new Date().getTime() < deadlineVn.getTime()
}

const isWholesaleGroup = (customer: CustomerDto | null): boolean => {
  return customer?.groupPrice?.trim().toUpperCase() === 'S'
}

const calculateDefaultUnitPrice = (product: ProductDto, customer: CustomerDto | null): number => {
  if (isWholesaleGroup(customer)) {
    return product.priceWholesale ?? product.priceRetail ?? product.basePrice
  }
  return product.priceRetail ?? product.basePrice
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// Single Product Line Component for Clean Hook & Search State Scope
function ProductLineItem({
  line,
  selectedCustomer,
  selectedProductIds,
  onUpdateLine,
  onRemoveLine,
  canRemove,
}: {
  line: CreateInvoiceLineState
  selectedCustomer: CustomerDto | null
  selectedProductIds: number[]
  onUpdateLine: (id: string, updated: Partial<CreateInvoiceLineState>) => void
  onRemoveLine: (id: string) => void
  canRemove: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: searchResultsData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['inventorySearch', debouncedSearch],
    queryFn: () => fetchInventory(debouncedSearch, 1, 50),
  })

  const searchResults = searchResultsData?.items ?? []

  // Ensure current selected product is included in options if not in search results
  const options = useMemo(() => {
    if (!line.selectedProduct) return searchResults
    const exists = searchResults.some((p) => p.id === line.selectedProduct?.id)
    return exists ? searchResults : [line.selectedProduct, ...searchResults]
  }, [searchResults, line.selectedProduct])

  const handleProductSelect = (product: ProductDto | null) => {
    if (!product) {
      onUpdateLine(line.id, {
        selectedProduct: null,
        unitPrice: 0,
        isPriceManuallyEdited: false,
      })
      return
    }
    const defaultPrice = calculateDefaultUnitPrice(product, selectedCustomer)
    onUpdateLine(line.id, {
      selectedProduct: product,
      unitPrice: defaultPrice,
      isPriceManuallyEdited: false,
    })
  }

  const lineTotal = (line.quantity || 0) * (line.unitPrice || 0)

  return (
    <Paper
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
        {/* Product Autocomplete */}
        <Grid item xs={12} md={5}>
          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
            SẢN PHẨM *
          </Typography>
          <Autocomplete
            size="small"
            options={options}
            loading={isSearchLoading}
            getOptionLabel={(p) => `[${p.sku}] ${p.name}`}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            getOptionDisabled={(opt) =>
              selectedProductIds.includes(opt.id) && opt.id !== line.selectedProduct?.id
            }
            value={line.selectedProduct}
            onChange={(_, val) => handleProductSelect(val)}
            onInputChange={(_, newInputValue) => setSearchTerm(newInputValue)}
            renderInput={(params) => (
              <TextField {...params} id={`product-select-${line.id}`} placeholder="Tìm theo SKU hoặc tên..." />
            )}
          />
        </Grid>

        {/* Quantity Input */}
        <Grid item xs={6} md={2}>
          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
            SỐ LƯỢNG *
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: 1 }}
            value={line.quantity}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => {
              const val = Number(e.target.value)
              onUpdateLine(line.id, { quantity: isNaN(val) ? 1 : Math.max(1, Math.floor(val)) })
            }}
            onBlur={() => {
              if (!line.quantity || line.quantity < 1) {
                onUpdateLine(line.id, { quantity: 1 })
              }
            }}
          />
        </Grid>

        {/* Editable Unit Price */}
        <Grid item xs={6} md={2.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block' }}>
              ĐƠN GIÁ (VND) *
            </Typography>
            {line.isPriceManuallyEdited && (
              <Typography variant="caption" sx={{ color: '#d97706', fontSize: 10, fontWeight: 600 }}>
                (Đã chỉnh tay)
              </Typography>
            )}
          </Box>
          <TextField
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: 0 }}
            value={line.unitPrice}
            onChange={(e) => {
              const val = Number(e.target.value)
              onUpdateLine(line.id, {
                unitPrice: isNaN(val) ? 0 : Math.max(0, val),
                isPriceManuallyEdited: true,
              })
            }}
          />
        </Grid>

        {/* Read-Only Subtotal Preview */}
        <Grid item xs={10} md={2}>
          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
            THÀNH TIỀN
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formatVND(lineTotal)}
            InputProps={{ readOnly: true }}
            sx={{ bgcolor: '#f5f5f5' }}
          />
        </Grid>

        {/* Remove Line Button */}
        <Grid item xs={2} md={0.5} sx={{ textAlign: 'center', pt: { md: 2.5 } }}>
          <IconButton
            size="small"
            onClick={() => onRemoveLine(line.id)}
            disabled={!canRemove}
            sx={{ color: '#b91c1c' }}
          >
            <Trash2 size={16} />
          </IconButton>
        </Grid>

        {/* Full-width Line Note / Description */}
        <Grid item xs={12}>
          <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
            GHI CHÚ DÒNG SẢN PHẨM
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Ghi chú chi tiết cho dòng sản phẩm (tùy chọn)..."
            value={line.description}
            onChange={(e) => onUpdateLine(line.id, { description: e.target.value })}
          />
        </Grid>
      </Grid>
    </Paper>
  )
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const linesContainerRef = useRef<HTMLDivElement>(null)
  const editLinesContainerRef = useRef<HTMLDivElement>(null)

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Toast Feedback State
  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  // Customer Autocomplete Server-Side Search State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const debouncedCustomerSearch = useDebounce(customerSearchTerm, 300)

  // Confirm Manual Price Reset Dialog State
  const [pendingCustomer, setPendingCustomer] = useState<CustomerDto | null>(null)
  const [isConfirmPriceUpdateOpen, setIsConfirmPriceUpdateOpen] = useState(false)

  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customersSearch', debouncedCustomerSearch],
    queryFn: () => fetchCustomers(debouncedCustomerSearch, 1, 50),
    enabled: isCreateOpen,
  })

  const customerOptions = useMemo(() => {
    const list = customersData?.items ?? []
    if (!selectedCustomer) return list
    const exists = list.some((c) => c.id === selectedCustomer.id)
    return exists ? list : [selectedCustomer, ...list]
  }, [customersData, selectedCustomer])

  // Create Invoice Lines State
  const [createLines, setCreateLines] = useState<CreateInvoiceLineState[]>([createEmptyInvoiceLine()])

  // Selected Product IDs for Duplicate Prevention
  const selectedProductIds = useMemo(() => {
    return createLines
      .map((l) => l.selectedProduct?.id)
      .filter((id): id is number => typeof id === 'number' && id > 0)
  }, [createLines])

  // Query Invoices List
  const { data: invoicesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchInvoices(),
  })

  // Query Selected Invoice Detail for Viewing / Printing
  const { data: invoiceDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['invoice', viewInvoiceId],
    queryFn: () => (viewInvoiceId ? fetchInvoiceById(viewInvoiceId) : null),
    enabled: Boolean(viewInvoiceId),
  })

  // Query Customer Details for Viewing / Printing Invoice
  const { data: customerDetail } = useQuery({
    queryKey: ['customerDetail', invoiceDetail?.customerId],
    queryFn: () => (invoiceDetail?.customerId ? fetchCustomerById(invoiceDetail.customerId) : null),
    enabled: Boolean(invoiceDetail?.customerId),
  })

  // Print Handler with dynamic PDF filename (document.title = invoiceDetail.id)
  const handlePrintInvoice = () => {
    if (!invoiceDetail) return
    const originalTitle = document.title
    document.title = invoiceDetail.id
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  // Edit Invoice Lines Dialog State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLines, setEditLines] = useState<CreateInvoiceLineState[]>([])
  const [editActionError, setEditActionError] = useState<string | null>(null)

  // Edit Invoice Lines Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: CreateInvoiceLineRequest[] }) => updateInvoiceLines(id, lines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', viewInvoiceId] })
      setIsEditOpen(false)
      setToastState({ open: true, message: 'Đã cập nhật hóa đơn thành công.' })
    },
    onError: (err: Error) => setEditActionError(err.message),
  })

  const handleOpenEditModal = () => {
    if (!invoiceDetail) return
    const baseTimestamp = Date.now()
    const initialLines: CreateInvoiceLineState[] = invoiceDetail.lines.map((l, index) => ({
      id: `edit-line-${index}-${baseTimestamp + index}`,
      entryTimestamp: baseTimestamp + index,
      selectedProduct: {
        id: l.productId,
        sku: `SP-${l.productId}`,
        name: l.productName,
        basePrice: l.unitPrice,
        priceRetail: l.unitPrice,
        priceWholesale: l.unitPrice,
        inStock: 9999,
        warningStock: 0,
        status: 1,
        updatedAt: '',
      },
      productSearchTerm: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      description: l.description || '',
      isPriceManuallyEdited: false,
    }))
    setEditLines(initialLines)
    setEditActionError(null)
    setIsEditOpen(true)
  }

  const handleAddEditLine = () => {
    const topLine = editLines[0]
    if (!topLine || !topLine.selectedProduct) {
      setToastState({
        open: true,
        message: 'Vui lòng chọn sản phẩm cho dòng hiện tại trước khi thêm dòng mới.',
      })
      if (topLine) {
        setTimeout(() => {
          document.getElementById(`product-select-${topLine.id}`)?.focus()
        }, 50)
      }
      return
    }
    const newDraft = createEmptyInvoiceLine()
    setEditLines((prev) => [newDraft, ...prev])
    setTimeout(() => {
      document.getElementById(`product-select-${newDraft.id}`)?.focus()
      editLinesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  const handleUpdateEditLine = (id: string, updated: Partial<CreateInvoiceLineState>) => {
    setEditLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)))
  }

  const handleRemoveEditLine = (id: string) => {
    setEditLines((prev) => prev.filter((l) => l.id !== id))
  }

  const editSelectedProductIds = useMemo(() => {
    return editLines.map((l) => l.selectedProduct?.id).filter((id): id is number => id != null)
  }, [editLines])

  const editTotalInvoiceAmount = useMemo(() => {
    return editLines.reduce((acc, l) => acc + (l.quantity || 0) * (l.unitPrice || 0), 0)
  }, [editLines])

  const handleEditSubmit = () => {
    setEditActionError(null)
    if (!viewInvoiceId || !invoiceDetail) return

    const validLines = editLines
      .filter((l) => l.selectedProduct !== null)
      .sort((a, b) => (a.entryTimestamp || 0) - (b.entryTimestamp || 0))

    if (validLines.length === 0) {
      setEditActionError('Hóa đơn phải có ít nhất 1 dòng sản phẩm.')
      return
    }

    const productIds = validLines.map((l) => l.selectedProduct!.id)
    const hasDuplicates = new Set(productIds).size !== productIds.length
    if (hasDuplicates) {
      setEditActionError('Mỗi sản phẩm chỉ được xuất hiện một lần trong hóa đơn.')
      return
    }

    const hasInvalidQty = validLines.some((l) => !l.quantity || l.quantity < 1)
    if (hasInvalidQty) {
      setEditActionError('Số lượng sản phẩm phải lớn hơn hoặc bằng 1.')
      return
    }

    const reqLines: CreateInvoiceLineRequest[] = validLines.map((l) => ({
      productId: l.selectedProduct!.id,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      description: l.description.trim() || undefined,
    }))

    editMutation.mutate({ id: viewInvoiceId, lines: reqLines })
  }

  // Create Invoice Mutation
  const createMutation = useMutation({
    mutationFn: (req: CreateInvoiceRequest) => createInvoice(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setSelectedCustomer(null)
    setCustomerSearchTerm('')
    setCreateLines([createEmptyInvoiceLine()])
    setActionError(null)
    setPendingCustomer(null)
    setIsConfirmPriceUpdateOpen(false)
  }

  // Helper to apply customer price updates to product lines
  const applyCustomerPriceUpdates = (newCust: CustomerDto | null, overrideManualPrices: boolean) => {
    const oldIsS = isWholesaleGroup(selectedCustomer)
    const newIsS = isWholesaleGroup(newCust)
    const isGroupChanged = oldIsS !== newIsS

    setSelectedCustomer(newCust)

    const validLinesCount = createLines.filter((l) => l.selectedProduct !== null).length

    // Update unit prices for lines
    setCreateLines((prevLines) =>
      prevLines.map((line) => {
        if (!line.selectedProduct) return line

        // If line price was edited manually and we choose to KEEP manual prices
        if (!overrideManualPrices && line.isPriceManuallyEdited) {
          return line
        }

        // Recalculate price based on new customer group
        const newPrice = calculateDefaultUnitPrice(line.selectedProduct, newCust)
        return {
          ...line,
          unitPrice: newPrice,
          isPriceManuallyEdited: overrideManualPrices ? false : line.isPriceManuallyEdited,
        }
      }),
    )

    // Show Toast if price group changed AND there are valid product lines
    if (isGroupChanged && validLinesCount > 0) {
      const toastMsg = newIsS
        ? 'Đã áp dụng giá sỉ cho các sản phẩm trong hóa đơn.'
        : 'Đã áp dụng giá lẻ cho các sản phẩm trong hóa đơn.'
      setToastState({ open: true, message: toastMsg })
    }
  }

  // Handle Customer Selection Change in Autocomplete
  const handleCustomerSelect = (newCust: CustomerDto | null) => {
    if (newCust?.id === selectedCustomer?.id) return

    const validLines = createLines.filter((l) => l.selectedProduct !== null)
    const hasManualPrices = validLines.some((l) => l.isPriceManuallyEdited)

    if (hasManualPrices) {
      // Show confirmation dialog if manual prices exist
      setPendingCustomer(newCust)
      setIsConfirmPriceUpdateOpen(true)
    } else {
      // Automatically update prices without dialog
      applyCustomerPriceUpdates(newCust, true)
    }
  }

  // Confirm manual price dialog choices
  const handleKeepManualPrices = () => {
    applyCustomerPriceUpdates(pendingCustomer, false)
    setIsConfirmPriceUpdateOpen(false)
    setPendingCustomer(null)
  }

  const handleApplyNewPricesToAll = () => {
    applyCustomerPriceUpdates(pendingCustomer, true)
    setIsConfirmPriceUpdateOpen(false)
    setPendingCustomer(null)
  }

  // Prepend line to top and scroll to top mượt
  const handleAddLine = () => {
    const topLine = createLines[0]
    if (!topLine || !topLine.selectedProduct) {
      setToastState({
        open: true,
        message: 'Vui lòng chọn sản phẩm cho dòng hiện tại trước khi thêm dòng mới.',
      })
      if (topLine) {
        setTimeout(() => {
          document.getElementById(`product-select-${topLine.id}`)?.focus()
        }, 50)
      }
      return
    }
    const newDraft = createEmptyInvoiceLine()
    setCreateLines((prev) => [newDraft, ...prev])
    setTimeout(() => {
      document.getElementById(`product-select-${newDraft.id}`)?.focus()
      linesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  const handleRemoveLine = (id: string) => {
    setCreateLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleUpdateLine = (id: string, updated: Partial<CreateInvoiceLineState>) => {
    setCreateLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)))
  }

  const hasIncompleteCreateLine = useMemo(() => {
    const topLine = createLines[0]
    return !topLine || topLine.selectedProduct === null
  }, [createLines])

  const hasIncompleteEditLine = useMemo(() => {
    const topLine = editLines[0]
    return !topLine || topLine.selectedProduct === null
  }, [editLines])

  // Total invoice estimated value
  const totalInvoiceAmount = useMemo(() => {
    return createLines.reduce((sum, line) => {
      if (!line.selectedProduct) return sum
      return sum + (line.quantity || 0) * (line.unitPrice || 0)
    }, 0)
  }, [createLines])

  // Handle Create Submit
  const handleCreateSubmit = () => {
    setActionError(null)

    if (!selectedCustomer) {
      setActionError('Vui lòng chọn khách hàng.')
      return
    }

    const validLines = createLines
      .filter((l) => l.selectedProduct !== null)
      .sort((a, b) => (a.entryTimestamp || 0) - (b.entryTimestamp || 0))
    if (validLines.length === 0) {
      setActionError('Vui lòng chọn ít nhất một sản phẩm cho hóa đơn.')
      return
    }

    // Check duplicate products
    const productIds = validLines.map((l) => l.selectedProduct!.id)
    if (new Set(productIds).size !== productIds.length) {
      setActionError('Không được chọn trùng sản phẩm ở nhiều dòng.')
      return
    }

    // Validate quantities & prices
    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i]
      if (!line.quantity || line.quantity < 1) {
        setActionError(`Dòng ${i + 1}: Số lượng phải lớn hơn hoặc bằng 1.`)
        return
      }
      if (line.unitPrice < 0) {
        setActionError(`Dòng ${i + 1}: Đơn giá không được âm.`)
        return
      }
    }

    const payload: CreateInvoiceRequest = {
      customerId: selectedCustomer.id,
      lines: validLines.map((l) => ({
        productId: l.selectedProduct!.id,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        description: l.description.trim() || null,
      })),
    }

    createMutation.mutate(payload)
  }

  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return []
    if (!search.trim()) return invoicesData
    const q = search.toLowerCase()
    return invoicesData.filter((i) => i.id.toLowerCase().includes(q) || String(i.customerId).includes(q))
  }, [invoicesData, search])

  const columns = useMemo<ColDef[]>(
    () => [
      {
        field: 'id',
        headerName: 'MÃ HÓA ĐƠN',
        width: 180,
        filter: true,
        sortable: true,
      },
      {
        field: 'customerId',
        headerName: 'MÃ KHÁCH HÀNG',
        width: 160,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<InvoiceSummaryDto, number>) => `KH-${p.value}`,
      },
      {
        field: 'createdAt',
        headerName: 'NGÀY TẠO',
        flex: 1,
        minWidth: 160,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<InvoiceSummaryDto, string>) =>
          p.value
            ? new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(p.value))
            : '—',
      },
      {
        field: 'total',
        headerName: 'TỔNG TIỀN',
        type: 'rightAligned',
        width: 160,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<InvoiceSummaryDto, number>) => formatVND(p.value),
      },
      {
        headerName: 'THAO TÁC',
        width: 150,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: InvoiceSummaryDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Xem chi tiết & In">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setViewInvoiceId(p.data.id)}
                  startIcon={<Eye size={14} />}
                  sx={{
                    height: 28,
                    fontSize: 12,
                    borderColor: '#e0e0e0',
                    color: '#171717',
                    '&:hover': { bgcolor: '#f2f2f2' },
                  }}
                >
                  Chi tiết
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
            Quản lý Hóa đơn
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Xem danh sách hóa đơn đơn hàng, tạo mới và in lại hóa đơn cho khách.
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
            Tạo hóa đơn
          </Button>
        </Box>
      </Box>

      {/* Search / Filter Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo mã hóa đơn (vd: INV-2026...)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Tổng số: <strong>{filteredInvoices.length}</strong> hóa đơn
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể tải danh sách hóa đơn: {(error as Error).message}
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
          <AgGridReact<InvoiceSummaryDto>
            rowData={filteredInvoices}
            columnDefs={columns}
            loading={isLoading}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu hóa đơn</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
          />
        </div>
      </Paper>

      {/* CREATE INVOICE DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Tạo hóa đơn đơn hàng mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          {/* Top Header Row: Customer Selection (Left) + Total Amount Block (Right) */}
          <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5, mb: 2 }}>
            <Grid item xs={12} md={7} lg={8}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                KHÁCH HÀNG *
              </Typography>
              <Autocomplete
                size="small"
                options={customerOptions}
                loading={isCustomersLoading}
                getOptionLabel={(c) =>
                  `${c.name}${c.phone ? ' — ' + c.phone : ''}${isWholesaleGroup(c) ? ' (Giá sỉ)' : ''}`
                }
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                value={selectedCustomer}
                onChange={(_, val) => handleCustomerSelect(val)}
                onInputChange={(_, newInputValue) => setCustomerSearchTerm(newInputValue)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Tìm khách hàng theo tên hoặc SĐT..." />
                )}
              />
            </Grid>

            <Grid item xs={12} md={5} lg={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.25,
                  px: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  textAlign: { xs: 'left', md: 'right' },
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', display: 'block' }}>
                  TỔNG TẠM TÍNH
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563eb', lineHeight: 1.2 }}>
                  {formatVND(totalInvoiceAmount)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Lines Section */}
          <Box sx={{ borderTop: '1px solid #ededed', pt: 1.5, mt: 1 }}>
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
                gap: 3,
                flexWrap: 'wrap',
                rowGap: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                  Chi tiết sản phẩm
                </Typography>
                <Typography variant="caption" sx={{ color: '#737373' }}>
                  Chọn sản phẩm, số lượng, đơn giá và ghi chú từng dòng
                </Typography>
              </Box>
              <Tooltip
                title={
                  hasIncompleteCreateLine
                    ? 'Vui lòng chọn sản phẩm cho dòng hiện tại trước khi thêm dòng mới.'
                    : ''
                }
              >
                <span>
                  <Button
                    size="small"
                    startIcon={<Plus size={14} />}
                    onClick={handleAddLine}
                    disabled={hasIncompleteCreateLine}
                    sx={{ color: '#171717', borderColor: '#e0e0e0', whiteSpace: 'nowrap' }}
                    variant="outlined"
                  >
                    Thêm dòng sản phẩm
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {/* Scrollable Container for Line Items */}
            <Box
              ref={linesContainerRef}
              sx={{
                maxHeight: 'min(48vh, 460px)',
                overflowY: 'auto',
                pr: 0.5,
              }}
            >
              {createLines.map((line) => (
                <ProductLineItem
                  key={line.id}
                  line={line}
                  selectedCustomer={selectedCustomer}
                  selectedProductIds={selectedProductIds}
                  onUpdateLine={handleUpdateLine}
                  onRemoveLine={handleRemoveLine}
                  canRemove={createLines.length > 1}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={createMutation.isPending || !selectedCustomer}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu hóa đơn
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRMATION DIALOG FOR MANUALLY EDITED PRICES WHEN SWITCHING CUSTOMER */}
      <Dialog
        open={isConfirmPriceUpdateOpen}
        onClose={() => {
          setIsConfirmPriceUpdateOpen(false)
          setPendingCustomer(null)
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Xác nhận cập nhật đơn giá</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#404040', mt: 1 }}>
            Một số đơn giá đã được chỉnh thủ công. Bạn có muốn áp dụng lại giá theo nhóm khách hàng mới cho tất cả sản phẩm không?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={handleKeepManualPrices} variant="outlined" color="inherit" size="small">
            Giữ giá đã nhập
          </Button>
          <Button
            onClick={handleApplyNewPricesToAll}
            variant="contained"
            size="small"
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Áp dụng giá mới
          </Button>
        </DialogActions>
      </Dialog>

      {/* TOAST SNACKBAR NOTIFICATION FOR PRICE GROUP CHANGE */}
      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={() => setToastState({ ...toastState, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastState({ ...toastState, open: false })}
          severity="info"
          sx={{ width: '100%', borderRadius: '6px', boxShadow: 3 }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>

      {/* PRINTABLE INVOICE DETAIL MODAL */}
      <Dialog
        open={Boolean(viewInvoiceId)}
        onClose={() => setViewInvoiceId(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
            Chi tiết hóa đơn {invoiceDetail?.id}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {invoiceDetail && (
              isInvoiceEditable(invoiceDetail.createdAt) ? (
                <Button
                  variant="outlined"
                  onClick={handleOpenEditModal}
                  startIcon={<Edit size={16} />}
                  sx={{ color: '#171717', borderColor: '#e0e0e0' }}
                >
                  Sửa hóa đơn
                </Button>
              ) : (
                <Tooltip title="Hóa đơn chỉ được chỉnh sửa hàng hóa trong 2 ngày sau khi tạo.">
                  <span>
                    <Button
                      variant="outlined"
                      disabled
                      startIcon={<Edit size={16} />}
                    >
                      Sửa hóa đơn
                    </Button>
                  </span>
                </Tooltip>
              )
            )}
            <Button
              variant="contained"
              onClick={handlePrintInvoice}
              startIcon={<Printer size={16} />}
              sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
            >
              In hóa đơn
            </Button>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent id="printable-invoice-content" sx={{ position: 'relative', overflow: 'hidden' }}>
          {/* Print Watermark */}
          <div className="invoice-watermark" aria-hidden="true">
            www.tranhkienghoathuan.com
          </div>
          {isDetailLoading ? (
            <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: '#737373' }}>
              Đang tải chi tiết hóa đơn...
            </Typography>
          ) : invoiceDetail ? (
            <Box sx={{ p: 1, position: 'relative', zIndex: 1 }}>
              {/* Header: Store Info (Left) | Title & Code (Right) */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                {/* Logo & Store Information */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Box
                    component="img"
                    src="/assets/logo.jpg"
                    alt="Logo Hòa Thuận"
                    sx={{
                      width: 56,
                      height: 56,
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: '#171717',
                        fontSize: 16,
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all',
                      }}
                    >
                      {STORE_INFO.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#404040', fontSize: 12.5, mt: 0.25 }}>
                      Địa chỉ: {STORE_INFO.address}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#404040', fontSize: 12.5, mt: 0.25 }}>
                      Điện thoại:{' '}
                      <Box component="span" sx={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {STORE_INFO.phoneLine1}
                      </Box>
                      {' • '}
                      <Box component="span" sx={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {STORE_INFO.phoneLine2}
                      </Box>
                    </Typography>
                  </Box>
                </Box>

                {/* Invoice Title, Code & Date */}
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#171717',
                      fontSize: 18,
                      whiteSpace: 'nowrap',
                      wordBreak: 'keep-all',
                      letterSpacing: '0.02em',
                    }}
                  >
                    HÓA ĐƠN BÁN HÀNG
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#171717',
                      fontSize: 13,
                      mt: 0.5,
                      whiteSpace: 'nowrap',
                      wordBreak: 'keep-all',
                    }}
                  >
                    Mã số: {invoiceDetail.id}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#525252',
                      fontSize: 12.5,
                      mt: 0.25,
                      whiteSpace: 'nowrap',
                      wordBreak: 'keep-all',
                    }}
                  >
                    Ngày lập: {formatDateDDMMYYYY(invoiceDetail.createdAt)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Customer Info */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', fontSize: 15 }}>
                  Khách hàng: {customerDetail ? `${customerDetail.name}${customerDetail.phone ? ' - ' + customerDetail.phone : ''}` : `KH-${invoiceDetail.customerId}`}
                </Typography>
              </Box>

              {/* Invoice Lines Table */}
              <Table size="small" sx={{ mb: 3, border: '1px solid #ededed' }}>
                <TableHead sx={{ bgcolor: '#f9f9f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>SẢN PHẨM</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      SỐ LƯỢNG
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ĐƠN GIÁ
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      THÀNH TIỀN
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>GHI CHÚ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceDetail.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 500 }}>{line.productName}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{formatVND(line.unitPrice)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatVND(line.subtotal)}
                      </TableCell>
                      <TableCell sx={{ color: '#404040', fontSize: 13 }}>
                        {line.description ? line.description : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer Row: QR Code (Left) + Total Amount Calculation (Right) */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
                {invoiceDetail.id ? (
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <QRCodeSVG value={invoiceDetail.id} size={72} level="M" />
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#737373',
                        fontSize: 11,
                        lineHeight: 1.3,
                      }}
                    >
                      <Box component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
                        Quét để tra cứu
                      </Box>
                      <Box component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
                        mã hóa đơn
                      </Box>
                    </Typography>
                  </Box>
                ) : (
                  <Box />
                )}

                <Box sx={{ width: 260 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#171717' }}>
                      TỔNG THÀNH TIỀN:
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#171717' }}>
                      {formatVND(invoiceDetail.total)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#b91c1c', py: 2 }}>
              Không tìm thấy thông tin chi tiết hóa đơn.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewInvoiceId(null)} variant="outlined" color="inherit">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT INVOICE LINES MODAL */}
      <Dialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Chỉnh sửa danh sách sản phẩm - Hóa đơn {invoiceDetail?.id}
        </DialogTitle>
        <DialogContent>
          {editActionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {editActionError}
            </Alert>
          )}

          {/* Top Header Row: Total Amount Block */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, mt: 0.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                px: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                textAlign: 'right',
                minWidth: 200,
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', display: 'block' }}>
                TỔNG TẠM TÍNH
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563eb', lineHeight: 1.2 }}>
                {formatVND(editTotalInvoiceAmount)}
              </Typography>
            </Paper>
          </Box>

          {/* Lines Section */}
          <Box sx={{ borderTop: '1px solid #ededed', pt: 1.5 }}>
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
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 3,
                flexWrap: 'wrap',
                rowGap: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                  Chi tiết sản phẩm
                </Typography>
                <Typography variant="caption" sx={{ color: '#737373' }}>
                  Điều chỉnh danh sách sản phẩm, số lượng, đơn giá và ghi chú
                </Typography>
              </Box>
              <Tooltip
                title={
                  hasIncompleteEditLine
                    ? 'Vui lòng chọn sản phẩm cho dòng hiện tại trước khi thêm dòng mới.'
                    : ''
                }
              >
                <span>
                  <Button
                    size="small"
                    startIcon={<Plus size={14} />}
                    onClick={handleAddEditLine}
                    disabled={hasIncompleteEditLine}
                    sx={{ color: '#171717', borderColor: '#e0e0e0', whiteSpace: 'nowrap' }}
                    variant="outlined"
                  >
                    Thêm dòng sản phẩm
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {/* Scrollable Container */}
            <Box ref={editLinesContainerRef} sx={{ maxHeight: 'min(48vh, 460px)', overflowY: 'auto', pr: 0.5 }}>
              {editLines.map((line) => (
                <ProductLineItem
                  key={line.id}
                  line={line}
                  selectedCustomer={customerDetail ?? null}
                  selectedProductIds={editSelectedProductIds}
                  onUpdateLine={handleUpdateEditLine}
                  onRemoveLine={handleRemoveEditLine}
                  canRemove={editLines.length > 1}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsEditOpen(false)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={editMutation.isPending || !invoiceDetail}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
