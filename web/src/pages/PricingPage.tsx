import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Divider,
  Autocomplete,
} from '@mui/material'
import { RefreshCw, Save, Calculator, AlertCircle, Info } from 'lucide-react'
import {
  fetchRateCard,
  updateRateCard,
  fetchProductComponent,
  upsertProductComponent,
  type UpdateRateCardRequest,
  type UpsertProductComponentRequest,
} from '../api/pricing'
import { fetchInventory } from '../api/inventory'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

const RATE_CARD_FIELDS: { key: keyof UpdateRateCardRequest; label: string; unit: string }[] = [
  { key: 'prKieng', label: 'Kính (prKieng)', unit: 'VND / m²' },
  { key: 'prNhL', label: 'Nhôm lớn (prNhL)', unit: 'VND / m' },
  { key: 'prNhN', label: 'Nhôm nhỏ (prNhN)', unit: 'VND / m' },
  { key: 'prGL', label: 'Gỗ lớn (prGL)', unit: 'VND / m' },
  { key: 'prGN', label: 'Gỗ nhỏ (prGN)', unit: 'VND / m' },
  { key: 'prDL', label: 'Đế lớn (prDL)', unit: 'VND / m' },
  { key: 'prBack', label: 'Lưng / MDF (prBack)', unit: 'VND / m²' },
  { key: 'prLua', label: 'Lụa (prLua)', unit: 'VND / m²' },
  { key: 'prKT', label: 'Kính tráng (prKT)', unit: 'VND / m²' },
  { key: 'prOc', label: 'Ốc / Phụ kiện (prOc)', unit: 'VND / cái' },
  { key: 'prNhom', label: 'Khung nhôm (prNhom)', unit: 'VND / m' },
  { key: 'pr7F', label: '7 Phân (pr7F)', unit: 'VND / m' },
  { key: 'pr2D', label: '2 Da (pr2D)', unit: 'VND / m²' },
  { key: 'prDecal', label: 'Decal (prDecal)', unit: 'VND / m²' },
]

const COMPONENT_FIELDS: { key: keyof UpsertProductComponentRequest; label: string }[] = [
  { key: 'valKieng', label: 'Hệ số Kính (valKieng)' },
  { key: 'valNhL', label: 'Hệ số Nhôm lớn (valNhL)' },
  { key: 'valNhN', label: 'Hệ số Nhôm nhỏ (valNhN)' },
  { key: 'valGL', label: 'Hệ số Gỗ lớn (valGL)' },
  { key: 'valGN', label: 'Hệ số Gỗ nhỏ (valGN)' },
  { key: 'valDL', label: 'Hệ số Đế lớn (valDL)' },
  { key: 'valBack', label: 'Hệ số Lưng / MDF (valBack)' },
  { key: 'valLua', label: 'Hệ số Lụa (valLua)' },
  { key: 'valKT', label: 'Hệ số Kính tráng (valKT)' },
  { key: 'valOc', label: 'Hệ số Ốc / Phụ kiện (valOc)' },
  { key: 'valNhom', label: 'Hệ số Khung nhôm (valNhom)' },
  { key: 'val7F', label: 'Hệ số 7 Phân (val7F)' },
  { key: 'val2D', label: 'Hệ số 2 Da (val2D)' },
  { key: 'valDecal', label: 'Hệ số Decal (valDecal)' },
]

const DEFAULT_COMPONENT_FORM: UpsertProductComponentRequest = {
  wage: 0,
  valKieng: null,
  valNhL: null,
  valNhN: null,
  valGL: null,
  valGN: null,
  valDL: null,
  valBack: null,
  valLua: null,
  valKT: null,
  valOc: null,
  valNhom: null,
  val7F: null,
  val2D: null,
  valDecal: null,
}

export default function PricingPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<number>(0)

  // ==================== TAB 1: RATE CARD STATES ====================
  const [rateCardForm, setRateCardForm] = useState<UpdateRateCardRequest>({
    prKieng: 0,
    prNhL: 0,
    prNhN: 0,
    prGL: 0,
    prGN: 0,
    prDL: 0,
    prBack: 0,
    prLua: 0,
    prKT: 0,
    prOc: 0,
    prNhom: 0,
    pr7F: 0,
    pr2D: 0,
    prDecal: 0,
  })
  const [isConfirmSaveRateCardOpen, setIsConfirmSaveRateCardOpen] = useState(false)
  const [rateCardActionMsg, setRateCardActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: rateCardData, isLoading: isRateCardLoading, refetch: refetchRateCard } = useQuery({
    queryKey: ['rateCard'],
    queryFn: fetchRateCard,
  })

  useEffect(() => {
    if (rateCardData) {
      setRateCardForm({
        prKieng: rateCardData.prKieng || 0,
        prNhL: rateCardData.prNhL || 0,
        prNhN: rateCardData.prNhN || 0,
        prGL: rateCardData.prGL || 0,
        prGN: rateCardData.prGN || 0,
        prDL: rateCardData.prDL || 0,
        prBack: rateCardData.prBack || 0,
        prLua: rateCardData.prLua || 0,
        prKT: rateCardData.prKT || 0,
        prOc: rateCardData.prOc || 0,
        prNhom: rateCardData.prNhom || 0,
        pr7F: rateCardData.pr7F || 0,
        pr2D: rateCardData.pr2D || 0,
        prDecal: rateCardData.prDecal || 0,
      })
    }
  }, [rateCardData])

  const rateCardMutation = useMutation({
    mutationFn: updateRateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rateCard'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setIsConfirmSaveRateCardOpen(false)
      setRateCardActionMsg({
        type: 'success',
        text: 'Đã cập nhật bảng giá vật tư thành công! Giá gốc toàn bộ sản phẩm đã được tính toán lại.',
      })
    },
    onError: (err: Error) => {
      setIsConfirmSaveRateCardOpen(false)
      setRateCardActionMsg({
        type: 'error',
        text: `Lỗi cập nhật bảng giá: ${err.message}`,
      })
    },
  })

  // ==================== TAB 2: PRODUCT COMPONENT FORMULA STATES ====================
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [productSearchInput, setProductSearchInput] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')

  const [componentForm, setComponentForm] = useState<UpsertProductComponentRequest>(DEFAULT_COMPONENT_FORM)
  const [componentActionMsg, setComponentActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const resetPricingInputs = () => {
    setSelectedProductId(null)
    setComponentForm(DEFAULT_COMPONENT_FORM)
    setComponentActionMsg(null)
  }

  // Debounce product search query by ~300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(productSearchInput)
    }, 300)
    return () => clearTimeout(handler)
  }, [productSearchInput])

  // Server-side Product Autocomplete Search
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['pricing-products', debouncedSearchQuery],
    queryFn: () => fetchInventory(debouncedSearchQuery, 1, 50),
  })

  const {
    data: componentData,
    isLoading: isComponentLoading,
    isError: isComponentNotFound,
  } = useQuery({
    queryKey: ['productComponent', selectedProductId],
    queryFn: () => (selectedProductId ? fetchProductComponent(selectedProductId) : null),
    enabled: Boolean(selectedProductId),
    retry: false,
  })

  useEffect(() => {
    if (componentData) {
      setComponentForm({
        wage: componentData.wage || 0,
        valKieng: componentData.valKieng ?? null,
        valNhL: componentData.valNhL ?? null,
        valNhN: componentData.valNhN ?? null,
        valGL: componentData.valGL ?? null,
        valGN: componentData.valGN ?? null,
        valDL: componentData.valDL ?? null,
        valBack: componentData.valBack ?? null,
        valLua: componentData.valLua ?? null,
        valKT: componentData.valKT ?? null,
        valOc: componentData.valOc ?? null,
        valNhom: componentData.valNhom ?? null,
        val7F: componentData.val7F ?? null,
        val2D: componentData.val2D ?? null,
        valDecal: componentData.valDecal ?? null,
      })
    } else if (isComponentNotFound) {
      setComponentForm(DEFAULT_COMPONENT_FORM)
    }
  }, [componentData, isComponentNotFound])

  const componentMutation = useMutation({
    mutationFn: ({ pId, req }: { pId: number; req: UpsertProductComponentRequest }) =>
      upsertProductComponent(pId, req),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['productComponent', res.productId] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setComponentActionMsg({
        type: 'success',
        text: `Đã lưu công thức sản phẩm! Giá gốc (BasePrice) tính từ server là ${formatVND(res.basePrice)}.`,
      })
    },
    onError: (err: Error) => {
      setComponentActionMsg({
        type: 'error',
        text: `Lỗi lưu công thức sản phẩm: ${err.message}`,
      })
    },
  })

  const selectedProduct = productsData?.items.find((p) => p.id === selectedProductId)

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Title block */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Định giá &amp; Công thức Giá sản phẩm
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Quản lý bảng đơn giá vật tư toàn xưởng và cấu hình hệ số tính giá cho từng sản phẩm.
          </Typography>
        </Box>
      </Box>

      {/* Tabs Bar */}
      <Paper elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: 14,
              minHeight: 48,
            },
          }}
        >
          <Tab label="1. Bảng đơn giá vật tư (Rate Card)" />
          <Tab label="2. Công thức sản phẩm (Product Components)" />
        </Tabs>
      </Paper>

      {/* ========================================================================= */}
      {/* TAB 1: BẢNG ĐƠN GIÁ RATE CARD                                              */}
      {/* ========================================================================= */}
      {activeTab === 0 && (
        <Box>
          {rateCardActionMsg && (
            <Alert
              severity={rateCardActionMsg.type}
              onClose={() => setRateCardActionMsg(null)}
              sx={{ mb: 3, borderRadius: '6px' }}
            >
              {rateCardActionMsg.text}
            </Alert>
          )}

          <Paper elevation={0} sx={{ p: 3, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3, p: 2, bgcolor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              <Info size={20} color="#1d4ed8" style={{ marginTop: 2, flexShrink: 0 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1d4ed8', mb: 0.5 }}>
                  Quy tắc tính giá tự động
                </Typography>
                <Typography variant="body2" sx={{ color: '#1e40af', fontSize: 13 }}>
                  Bảng giá vật tư gồm 14 đơn giá chuẩn. Khi bạn nhấn <strong>Cập nhật bảng giá</strong>, hệ thống phía Server sẽ tự động tính toán lại Giá gốc (Base Price) cho tất cả sản phẩm trong cơ sở dữ liệu dựa trên hệ số cấu thành.
                </Typography>
              </Box>
            </Box>

            {isRateCardLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} sx={{ color: '#7299ED' }} />
              </Box>
            ) : (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', mb: 2 }}>
                  Chi tiết 14 đơn giá thành phần
                </Typography>

                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                  {RATE_CARD_FIELDS.map((f) => (
                    <Grid item xs={12} sm={6} md={3} key={f.key}>
                      <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                        {f.label.toUpperCase()} ({f.unit})
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        value={rateCardForm[f.key]}
                        onChange={(e) =>
                          setRateCardForm({ ...rateCardForm, [f.key]: Number(e.target.value) })
                        }
                        InputProps={{
                          endAdornment: (
                            <Typography variant="caption" sx={{ color: '#a3a3a3', ml: 1 }}>
                              ₫
                            </Typography>
                          ),
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#a3a3a3' }}>
                    Cập nhật gần nhất: {rateCardData?.updatedAt ? new Date(rateCardData.updatedAt).toLocaleString('vi-VN') : '—'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={() => refetchRateCard()}
                      startIcon={<RefreshCw size={15} />}
                      sx={{ borderColor: '#e0e0e0', color: '#171717' }}
                    >
                      Tải lại
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setIsConfirmSaveRateCardOpen(true)}
                      startIcon={<Save size={16} />}
                      sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
                    >
                      Cập nhật bảng giá
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </Paper>

          {/* CONFIRM SAVE RATE CARD DIALOG */}
          <Dialog
            open={isConfirmSaveRateCardOpen}
            onClose={() => setIsConfirmSaveRateCardOpen(false)}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
          >
            <DialogTitle sx={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle size={20} color="#b45309" />
              Xác nhận tính lại giá toàn bộ?
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: '#404040' }}>
                Lưu bảng giá mới sẽ kích hoạt lại thuật toán tính <strong>Giá gốc (Base Price)</strong> cho tất cả sản phẩm đang có trong hệ thống.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setIsConfirmSaveRateCardOpen(false)} variant="outlined" color="inherit">
                Hủy
              </Button>
              <Button
                onClick={() => rateCardMutation.mutate(rateCardForm)}
                variant="contained"
                disabled={rateCardMutation.isPending}
                sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
              >
                Xác nhận lưu
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CÔNG THỨC SẢN PHẨM (PRODUCT COMPONENTS)                            */}
      {/* ========================================================================= */}
      {activeTab === 1 && (
        <Box>
          {componentActionMsg && (
            <Alert
              severity={componentActionMsg.type}
              onClose={() => setComponentActionMsg(null)}
              sx={{ mb: 3, borderRadius: '6px' }}
            >
              {componentActionMsg.text}
            </Alert>
          )}

          <Paper elevation={0} sx={{ p: 3, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', mb: 3 }}>
            {/* Product Selector */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', mb: 1.5 }}>
              Chọn sản phẩm để cấu hình công thức
            </Typography>

            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} sm={7}>
                <Autocomplete
                  options={productsData?.items ?? []}
                  loading={isProductsLoading}
                  value={selectedProduct || null}
                  getOptionLabel={(p) => `${p.sku} — ${p.name}`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  filterOptions={(x) => x}
                  onInputChange={(_, v) => {
                    setProductSearchInput(v)
                    if (v === '' && !selectedProductId) {
                      resetPricingInputs()
                    }
                  }}
                  onChange={(_, p) => {
                    if (!p) {
                      resetPricingInputs()
                      setProductSearchInput('')
                    } else {
                      setSelectedProductId(p.id)
                    }
                  }}
                  noOptionsText="Không tìm thấy sản phẩm"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Tìm theo SKU hoặc tên sản phẩm..."
                      size="small"
                      onBlur={() => {
                        if (!selectedProductId || !productSearchInput.trim()) {
                          resetPricingInputs()
                          setProductSearchInput('')
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isProductsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {selectedProduct && (
                <Grid item xs={12} sm={5}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f9f9f9', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                      SẢN PHẨM ĐANG CHỌN
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717' }}>
                      {selectedProduct.sku} — {selectedProduct.name}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* Server-Computed Result Banner */}
            {selectedProductId && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 4,
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, letterSpacing: '0.04em' }}>
                    GIÁ GỐC TÍNH TỪ SERVER (BASE PRICE)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#15803d', mt: 0.5 }}>
                    {isComponentLoading ? '...' : formatVND(componentData?.basePrice ?? selectedProduct?.basePrice)}
                  </Typography>
                </Box>

                <Chip
                  icon={<Calculator size={14} color="#15803d" />}
                  label="Server Compute (Chỉ đọc)"
                  variant="outlined"
                  sx={{ bgcolor: '#ffffff', borderColor: '#86efac', color: '#15803d', fontWeight: 500 }}
                />
              </Paper>
            )}

            {/* Component Formula Form */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', mb: 2 }}>
              Cấu hình Tiền công thợ &amp; 14 Hệ số thành phần (Nullable)
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {/* Wage / Tiền công */}
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" sx={{ color: '#171717', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  TIỀN CÔNG THỜ (WAGE) *
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={componentForm.wage || ''}
                  onChange={(e) => setComponentForm({ ...componentForm, wage: Number(e.target.value) })}
                  InputProps={{
                    endAdornment: (
                      <Typography variant="caption" sx={{ color: '#a3a3a3', ml: 1 }}>
                        ₫
                      </Typography>
                    ),
                  }}
                />
              </Grid>

              {/* 14 Val* Component Coefficients */}
              {COMPONENT_FIELDS.map((f) => (
                <Grid item xs={12} sm={6} md={3} key={f.key}>
                  <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                    {f.label.toUpperCase()}
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    placeholder="Bỏ trống nếu không dùng"
                    value={componentForm[f.key] ?? ''}
                    onChange={(e) => {
                      const valStr = e.target.value
                      setComponentForm({
                        ...componentForm,
                        [f.key]: valStr === '' ? null : Number(valStr),
                      })
                    }}
                  />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button
                variant="contained"
                disabled={!selectedProductId || componentMutation.isPending}
                onClick={() =>
                  selectedProductId &&
                  componentMutation.mutate({ pId: selectedProductId, req: componentForm })
                }
                startIcon={<Save size={16} />}
                sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
              >
                Lưu công thức &amp; tính giá gốc
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  )
}
