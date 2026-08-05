import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { Box, Typography, TextField, InputAdornment, Button, Paper, Alert, Chip } from '@mui/material'
import { Search, Plus, RefreshCw } from 'lucide-react'
import { fetchInventoryTransactions, type InventoryTransactionDto } from '../api/inventoryTransactions'

export default function InventoryTransactionsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inventoryTransactions', search],
    queryFn: () => fetchInventoryTransactions(search),
  })

  const columns = useMemo<ColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 90, sortable: true },
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
              bgcolor: p.value === 1 ? '#eff6ff' : '#fffbeb',
              color: p.value === 1 ? '#1d4ed8' : '#b45309',
              fontWeight: 500,
              borderRadius: '4px',
            }}
          />
        ),
      },
      { field: 'transactionDate', headerName: 'NGÀY PHIẾU', width: 150, sortable: true },
      { field: 'note', headerName: 'GHI CHÚ KHO', flex: 1, minWidth: 220 },
    ],
    [],
  )

  return (
    <Box sx={{ width: '100%' }}>
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
          <Button variant="outlined" onClick={() => refetch()} startIcon={<RefreshCw size={15} />} sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717' }}>
            Làm mới
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff' }}>
            Tạo phiếu kho
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <TextField
          placeholder="Tìm theo mã phiếu kho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search size={16} color="#a3a3a3" /></InputAdornment>) }}
          sx={{ width: 320 }}
        />
      </Paper>

      <Alert severity="info" sx={{ mb: 2, borderRadius: '6px' }}>
        Giao diện đã sẵn sàng. Đang chờ Backend hoàn thiện endpoint <code>GET /api/inventory-transactions</code>.
      </Alert>

      <Paper elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', overflow: 'hidden', height: 'calc(100vh - 290px)' }}>
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<InventoryTransactionDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu (Chờ Backend API /api/inventory-transactions)</span>'
            pagination
          />
        </div>
      </Paper>
    </Box>
  )
}
