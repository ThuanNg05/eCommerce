import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { Box, Typography, TextField, InputAdornment, Button, Paper, Alert, Chip } from '@mui/material'
import { Search, Plus, RefreshCw } from 'lucide-react'
import { fetchBackboards, type BackboardDto } from '../api/backboards'

const formatVND = (v?: number | null) => (v == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v))

export default function BackboardsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['backboards', search],
    queryFn: () => fetchBackboards(search),
  })

  const columns = useMemo<ColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 90, sortable: true },
      { field: 'type', headerName: 'LOẠI TẤM LƯNG', width: 150, sortable: true },
      { field: 'importPrice', headerName: 'GIÁ NHẬP', type: 'rightAligned', width: 140, valueFormatter: (p: ValueFormatterParams<BackboardDto, number>) => formatVND(p.value) },
      { field: 'salePrice', headerName: 'GIÁ BÁN', type: 'rightAligned', width: 140, valueFormatter: (p: ValueFormatterParams<BackboardDto, number | null>) => formatVND(p.value) },
      { field: 'inStock', headerName: 'TỒN KHO', type: 'rightAligned', width: 110 },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 130,
        cellRenderer: (p: { value: number }) => (
          <Chip label={p.value === 1 ? 'Hoạt động' : 'Ngưng'} size="small" sx={{ bgcolor: p.value === 1 ? '#f0fdf4' : '#fef2f2', color: p.value === 1 ? '#15803d' : '#b91c1c', fontSize: 12, borderRadius: '4px' }} />
        ),
      },
      { field: 'description', headerName: 'MÔ TẢ', flex: 1, minWidth: 200 },
    ],
    [],
  )

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Quản lý Tấm lưng
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Thông số và tồn kho tấm lưng ván lót MDF, Alu.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => refetch()} startIcon={<RefreshCw size={15} />} sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717' }}>
            Làm mới
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff' }}>
            Thêm tấm lưng
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <TextField
          placeholder="Tìm theo mô tả tấm lưng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search size={16} color="#a3a3a3" /></InputAdornment>) }}
          sx={{ width: 320 }}
        />
      </Paper>

      <Alert severity="info" sx={{ mb: 2, borderRadius: '6px' }}>
        Giao diện đã sẵn sàng. Đang chờ Backend hoàn thiện endpoint <code>GET /api/backboards</code>.
      </Alert>

      <Paper elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', overflow: 'hidden', height: 'calc(100vh - 290px)' }}>
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<BackboardDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu (Chờ Backend API /api/backboards)</span>'
            pagination
          />
        </div>
      </Paper>
    </Box>
  )
}
