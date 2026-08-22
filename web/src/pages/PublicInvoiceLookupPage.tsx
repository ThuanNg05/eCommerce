import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import { Search, Printer, FileText, AlertCircle, ShieldCheck } from 'lucide-react'
import { fetchPublicInvoice, lookupPublicInvoice } from '../api/invoices'
import { STORE_INFO } from '../constants/storeInfo'
import { formatDate } from '../utils/dateFormat'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function PublicInvoiceLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tokenParam = searchParams.get('token')?.trim() || ''

  const [code, setCode] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // QR token lookup
  const tokenQuery = useQuery({
    queryKey: ['publicInvoice', tokenParam],
    queryFn: () => fetchPublicInvoice(tokenParam),
    enabled: Boolean(tokenParam),
    retry: 1,
  })

  // Manual lookup via code + phoneLast4
  const lookupMutation = useMutation({
    mutationFn: lookupPublicInvoice,
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmedCode = code.trim().toUpperCase()
    const trimmedPhone = phoneLast4.trim()

    if (!trimmedCode) {
      setFormError('Vui lòng nhập mã tra cứu (8 ký tự).')
      return
    }
    if (trimmedCode.length !== 8) {
      setFormError('Mã tra cứu phải có đúng 8 ký tự.')
      return
    }
    if (!trimmedPhone) {
      setFormError('Vui lòng nhập 4 số cuối điện thoại.')
      return
    }
    if (trimmedPhone.length !== 4) {
      setFormError('Số điện thoại phải gồm đúng 4 chữ số cuối.')
      return
    }

    if (tokenParam) {
      setSearchParams({})
    }

    lookupMutation.mutate({
      code: trimmedCode,
      phoneLast4: trimmedPhone,
    })
  }

  const isLoading = lookupMutation.isPending || (Boolean(tokenParam) && tokenQuery.isLoading)
  const isError = Boolean(formError) || lookupMutation.isError || (Boolean(tokenParam) && tokenQuery.isError)
  const errorMessage =
    formError ||
    (lookupMutation.error as Error)?.message ||
    (tokenQuery.error as Error)?.message ||
    'Không tìm thấy hóa đơn hoặc liên kết tra cứu đã hết hiệu lực. Vui lòng kiểm tra lại mã tra cứu hoặc liên hệ với cơ sở để được hỗ trợ.'

  const invoice = lookupMutation.data ?? (tokenParam ? tokenQuery.data : null)

  const handlePrint = () => {
    if (!invoice) return
    const originalTitle = document.title
    document.title = `HoaDon_${invoice.id}`
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f9f9f9',
        py: { xs: 2.5, sm: 4 },
        px: { xs: 1.5, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        {/* Search Header / Bar (Hidden on print) */}
        <Paper
          elevation={0}
          className="no-print"
          sx={{
            p: 2.5,
            mb: 3,
            bgcolor: '#ffffff',
            border: '1px solid #ededed',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <FileText size={20} color="#171717" />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717', fontSize: 16 }}>
              Tra cứu hóa đơn trực tuyến
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#737373', mb: 2, fontSize: 13 }}>
            Nhập mã tra cứu (8 ký tự) và 4 số cuối số điện thoại khách hàng hoặc quét mã QR trên hóa đơn để xem chi tiết.
          </Typography>

          <form onSubmit={handleSearchSubmit}>
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <TextField
                size="small"
                label="Mã tra cứu (8 ký tự)"
                placeholder="Ví dụ: A1B2C3D4"
                value={code}
                onChange={(e) => {
                  setFormError(null)
                  setCode(e.target.value.toUpperCase().slice(0, 8))
                }}
                inputProps={{ maxLength: 8, style: { textTransform: 'uppercase' } }}
                sx={{ flex: { sm: 1.2 } }}
              />
              <TextField
                size="small"
                label="4 số cuối điện thoại"
                placeholder="Ví dụ: 6789"
                value={phoneLast4}
                onChange={(e) => {
                  setFormError(null)
                  setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))
                }}
                inputProps={{ maxLength: 4, inputMode: 'numeric' }}
                sx={{ flex: { sm: 1 } }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Search size={16} />}
                sx={{
                  height: 40,
                  bgcolor: '#1a1a1a',
                  color: '#ffffff',
                  px: 3,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#000000' },
                }}
              >
                {isLoading ? 'Đang tra cứu...' : 'Tra cứu'}
              </Button>
            </Box>
          </form>
        </Paper>

        {/* Loading State */}
        {isLoading && (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
            }}
          >
            <CircularProgress size={32} sx={{ color: '#1a1a1a', mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#171717', fontWeight: 500 }}>
              Đang tải dữ liệu hóa đơn...
            </Typography>
            <Typography variant="body2" sx={{ color: '#737373', mt: 0.5, fontSize: 13 }}>
              Vui lòng chờ trong giây lát.
            </Typography>
          </Paper>
        )}

        {/* Error / Not Found State */}
        {!isLoading && isError && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: '#fef2f2',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <AlertCircle size={24} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717', mb: 1, fontSize: 16 }}>
              Không tìm thấy hóa đơn
            </Typography>
            <Typography variant="body2" sx={{ color: '#737373', maxWidth: 500, mx: 'auto', mb: 2.5, fontSize: 13.5 }}>
              {errorMessage}
            </Typography>
            <Alert severity="info" sx={{ maxWidth: 540, mx: 'auto', textAlign: 'left', borderRadius: '6px', fontSize: 13 }}>
              Vui lòng kiểm tra lại mã tra cứu (8 ký tự) và 4 số cuối số điện thoại hoặc liên hệ số hotline: <strong>{STORE_INFO.phoneDisplay}</strong> để được hỗ trợ.
            </Alert>
          </Paper>
        )}

        {/* Empty State (No lookup submitted & no token) */}
        {!isLoading && !isError && !invoice && (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <ShieldCheck size={26} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717', mb: 1, fontSize: 16 }}>
              Cổng tra cứu thông tin hóa đơn
            </Typography>
            <Typography variant="body2" sx={{ color: '#737373', maxWidth: 460, mx: 'auto', fontSize: 13.5 }}>
              Vui lòng nhập mã tra cứu (8 ký tự) cùng 4 số cuối số điện thoại ở trên hoặc quét mã QR trên phiếu giao hàng/hóa đơn để xem chi tiết.
            </Typography>
          </Paper>
        )}

        {/* Invoice Found State */}
        {!isLoading && !isError && invoice && (
          <Paper
            id="printable-invoice-content"
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 4 },
              bgcolor: '#ffffff',
              border: '1px solid #ededed',
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Store Info & Document Title */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                mb: 3,
              }}
            >
              {/* Store Logo & Contact */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box
                  component="img"
                  src="/assets/logo.jpg"
                  alt="Logo Cơ sở Hòa Thuận"
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
                    }}
                  >
                    {STORE_INFO.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#404040', fontSize: 12.5, mt: 0.25 }}>
                    Địa chỉ: {STORE_INFO.address}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#404040', fontSize: 12.5, mt: 0.25 }}>
                    Điện thoại: {STORE_INFO.phoneDisplay}
                  </Typography>
                </Box>
              </Box>

              {/* Invoice Meta */}
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#171717',
                    fontSize: 18,
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
                  }}
                >
                  Mã số: {invoice.id}
                </Typography>
                {invoice.publicLookupCode && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#171717',
                      fontSize: 13,
                      mt: 0.25,
                    }}
                  >
                    Mã tra cứu: {invoice.publicLookupCode}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: '#525252',
                    fontSize: 12.5,
                    mt: 0.25,
                  }}
                >
                  Ngày lập: {formatDate(invoice.createdAt)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* Customer Information (Public) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', fontSize: 15 }}>
                Khách hàng: {invoice.customerName || 'Khách lẻ'}
              </Typography>
            </Box>

            {/* Product Lines Table */}
            <TableContainer
              sx={{
                mb: 3,
                border: '1px solid #ededed',
                borderRadius: '6px',
                overflowX: 'auto',
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f9f9f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 48, textAlign: 'center' }}>STT</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>TÊN SẢN PHẨM</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, width: 90 }}>
                      SỐ LƯỢNG
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, width: 130 }}>
                      ĐƠN GIÁ
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, width: 140 }}>
                      THÀNH TIỀN
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>GHI CHÚ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.lines.map((line, idx) => (
                    <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#fbfbfb' } }}>
                      <TableCell sx={{ color: '#737373', textAlign: 'center', fontSize: 13 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 500, color: '#171717' }}>{line.productName}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {line.quantity}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatVND(line.unitPrice)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#171717', fontVariantNumeric: 'tabular-nums' }}>
                        {formatVND(line.subtotal)}
                      </TableCell>
                      <TableCell sx={{ color: '#404040', fontSize: 13 }}>
                        {line.description ? line.description : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Total Calculation */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#f9f9f9',
                  border: '1px solid #ededed',
                  borderRadius: '6px',
                  minWidth: { xs: '100%', sm: 280 },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#171717', fontSize: 15 }}>
                    TỔNG CỘNG:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#1a1a1a',
                      fontSize: 17,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatVND(invoice.total)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Verification Note */}
            <Box
              sx={{
                p: 2,
                mb: 3,
                bgcolor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <ShieldCheck size={20} color="#15803d" />
              <Typography variant="body2" sx={{ color: '#15803d', fontSize: 13 }}>
                Hóa đơn điện tử chính thức được phát hành bởi <strong>{STORE_INFO.name}</strong>. Mọi thắc mắc xin vui lòng liên hệ hotline: <strong>{STORE_INFO.phoneDisplay}</strong>.
              </Typography>
            </Box>

            {/* Actions (Hidden on Print) */}
            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
              <Button
                variant="outlined"
                onClick={handlePrint}
                startIcon={<Printer size={16} />}
                sx={{
                  height: 36,
                  borderColor: '#e0e0e0',
                  color: '#171717',
                  bgcolor: '#ffffff',
                  '&:hover': { bgcolor: '#f2f2f2' },
                }}
              >
                In hóa đơn
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
