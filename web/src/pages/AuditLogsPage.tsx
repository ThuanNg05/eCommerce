import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
} from '@mui/material'
import { Search, RefreshCw, Eye, FileText } from 'lucide-react'
import { fetchAuditLogs, type AuditLogDto } from '../api/audit'

function formatJsonString(raw?: string | null) {
  if (!raw) return '— (Không có dữ liệu)'
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogDto | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['auditLogs', search, tableFilter, actionFilter],
    queryFn: () => fetchAuditLogs(1, 100, tableFilter, actionFilter, search),
  })

  const columns = useMemo<ColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 90, sortable: true },
      {
        field: 'tableName',
        headerName: 'BẢNG DỮ LIỆU',
        width: 170,
        sortable: true,
        cellRenderer: (p: { value: string }) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#171717' }}>
            {p.value}
          </Typography>
        ),
      },
      {
        field: 'recordId',
        headerName: 'MÃ BẢN GHI',
        width: 140,
        sortable: true,
        cellRenderer: (p: { value: string }) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#525252' }}>
            {p.value}
          </Typography>
        ),
      },
      {
        field: 'action',
        headerName: 'THAO TÁC',
        width: 140,
        sortable: true,
        cellRenderer: (p: { value: string }) => {
          const act = p.value?.toUpperCase()
          if (act === 'I' || act === 'INSERT') {
            return (
              <Chip
                label="INSERT (Thêm)"
                size="small"
                sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: 11, borderRadius: '4px' }}
              />
            )
          }
          if (act === 'U' || act === 'UPDATE') {
            return (
              <Chip
                label="UPDATE (Sửa)"
                size="small"
                sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 600, fontSize: 11, borderRadius: '4px' }}
              />
            )
          }
          if (act === 'D' || act === 'DELETE') {
            return (
              <Chip
                label="DELETE (Xóa)"
                size="small"
                sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 600, fontSize: 11, borderRadius: '4px' }}
              />
            )
          }
          return <Chip label={act || '—'} size="small" />
        },
      },
      {
        field: 'changedBy',
        headerName: 'NGƯỜI THAY ĐỔI',
        width: 150,
        sortable: true,
        valueFormatter: (p) => (p.value ? `User #${p.value}` : 'Hệ thống'),
      },
      {
        field: 'changedAt',
        headerName: 'THỜI GIAN',
        width: 190,
        sortable: true,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString('vi-VN') : '—'),
      },
      {
        headerName: 'CHI TIẾT SNAPSHOT',
        flex: 1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: AuditLogDto }) => {
          if (!p.data) return null
          return (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedAuditLog(p.data)}
              startIcon={<Eye size={14} />}
              sx={{
                height: 28,
                fontSize: 12,
                px: 1.5,
                borderColor: '#e0e0e0',
                color: '#171717',
                '&:hover': { bgcolor: '#f2f2f2' },
              }}
            >
              Xem JSON
            </Button>
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
            Nhật ký Thay đổi (Audit Logs)
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Theo dõi vết lịch sử thêm, sửa, xóa dữ liệu trên hệ thống.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => refetch()}
          startIcon={<RefreshCw size={15} />}
          sx={{ height: 36, borderColor: '#e0e0e0', color: '#171717' }}
        >
          Làm mới
        </Button>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Tìm theo từ khóa..."
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
            sx={{ width: 260 }}
          />

          <TextField
            placeholder="Lọc tên Bảng (vd: Products)..."
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            size="small"
            sx={{ width: 220 }}
          />

          <TextField
            select
            label="Thao tác"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            size="small"
            sx={{ width: 160 }}
          >
            <MenuItem value="">Tất cả thao tác</MenuItem>
            <MenuItem value="I">INSERT (Thêm mới)</MenuItem>
            <MenuItem value="U">UPDATE (Cập nhật)</MenuItem>
            <MenuItem value="D">DELETE (Xóa)</MenuItem>
          </TextField>

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, ml: 'auto' }}>
            Tổng số nhật ký: <strong>{data?.totalCount ?? 0}</strong>
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể tải nhật ký audit: {(error as Error).message}
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
          <AgGridReact<AuditLogDto>
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

      {/* EXPANDABLE JSON SNAPSHOT DIALOG */}
      <Dialog
        open={Boolean(selectedAuditLog)}
        onClose={() => setSelectedAuditLog(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText size={18} color="#7299ED" />
          Chi tiết Audit Log #{selectedAuditLog?.id} — {selectedAuditLog?.tableName} (Mã bản ghi: {selectedAuditLog?.recordId})
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#737373' }}>
              Thao tác: <strong>{selectedAuditLog?.action}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#737373' }}>
              Thời gian: <strong>{selectedAuditLog?.changedAt ? new Date(selectedAuditLog.changedAt).toLocaleString('vi-VN') : '—'}</strong>
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Old Values */}
            <Grid item xs={12} md={6}>
              <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600, display: 'block', mb: 0.5 }}>
                DỮ LIỆU CŨ (OLD VALUES)
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: '#fcfcfc',
                  borderColor: '#ededed',
                  maxHeight: 400,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  color: '#404040',
                }}
              >
                {formatJsonString(selectedAuditLog?.oldValues)}
              </Paper>
            </Grid>

            {/* New Values */}
            <Grid item xs={12} md={6}>
              <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, display: 'block', mb: 0.5 }}>
                DỮ LIỆU MỚI (NEW VALUES)
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: '#fcfcfc',
                  borderColor: '#ededed',
                  maxHeight: 400,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  color: '#404040',
                }}
              >
                {formatJsonString(selectedAuditLog?.newValues)}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedAuditLog(null)} variant="outlined" color="inherit">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
