import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { Box, Typography, TextField, InputAdornment, Button, Paper, Alert } from '@mui/material'
import { Search, Plus, RefreshCw } from 'lucide-react'
import { fetchCategories, type CategoryDto } from '../api/categories'

export default function CategoriesPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => fetchCategories(search),
  })

  const columns = useMemo<ColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 100, sortable: true },
      { field: 'name', headerName: 'TÊN DANH MỤC', flex: 1, minWidth: 220, filter: true, sortable: true },
      { field: 'createdAt', headerName: 'NGÀY TẠO', width: 200, sortable: true },
    ],
    [],
  )

  return (
    <Box sx={{ width: '100%' }}>
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
          <Button variant="outlined" onClick={() => refetch()} startIcon={<RefreshCw size={15} />} sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717' }}>
            Làm mới
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff' }}>
            Thêm danh mục
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <TextField
          placeholder="Tìm tên danh mục..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search size={16} color="#a3a3a3" /></InputAdornment>) }}
          sx={{ width: 320 }}
        />
      </Paper>

      <Alert severity="info" sx={{ mb: 2, borderRadius: '6px' }}>
        Giao diện đã sẵn sàng. Đang chờ Backend hoàn thiện endpoint <code>GET /api/categories</code>.
      </Alert>

      <Paper elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', overflow: 'hidden', height: 'calc(100vh - 290px)' }}>
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<CategoryDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu (Chờ Backend API /api/categories)</span>'
            pagination
          />
        </div>
      </Paper>
    </Box>
  )
}
