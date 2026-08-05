import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { Box, Typography, TextField, InputAdornment, Button, Chip, Paper } from '@mui/material'
import { Search, Plus, RefreshCw } from 'lucide-react'
import { fetchInventory, type ProductDto } from '../api/inventory'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => fetchInventory(search),
  })

  const columns = useMemo<ColDef[]>(
    () => [
      {
        field: 'sku',
        headerName: 'SKU',
        width: 140,
        filter: true,
        sortable: true,
      },
      {
        field: 'name',
        headerName: 'TÊN SẢN PHẨM',
        flex: 1,
        minWidth: 240,
        filter: true,
        sortable: true,
      },
      {
        field: 'basePrice',
        headerName: 'GIÁ GỐC',
        type: 'rightAligned',
        width: 140,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number>) => formatVND(p.value),
      },
      {
        field: 'priceRetail',
        headerName: 'BÁN LẺ',
        type: 'rightAligned',
        width: 140,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number | null>) => formatVND(p.value),
      },
      {
        field: 'priceWholesale',
        headerName: 'BÁN SỈ',
        type: 'rightAligned',
        width: 140,
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
        width: 130,
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
    </Box>
  )
}
