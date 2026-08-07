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
} from '@mui/material'
import { Plus, RefreshCw, Edit3, Trash2 } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchFrames,
  createFrame,
  updateFrame,
  type FrameDto,
  type CreateFrameRequest,
  type UpdateFrameRequest,
} from '../api/frames'
import { fetchSubBackboards } from '../api/subBackboards'

interface FrameLineFormItem {
  subBackboardId: number | ''
  quantity: number | ''
}

export default function FramesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editFrame, setEditFrame] = useState<FrameDto | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form States for Create
  const [createCode, setCreateCode] = useState<string>('')
  const [createDescription, setCreateDescription] = useState<string>('')
  const [createLines, setCreateLines] = useState<FrameLineFormItem[]>([
    { subBackboardId: '', quantity: 1 },
  ])

  // Form States for Edit
  const [editCode, setEditCode] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')
  const [editStatus, setEditStatus] = useState<number>(1)
  const [editLines, setEditLines] = useState<FrameLineFormItem[]>([])

  // Query Frames Data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['frames', search],
    queryFn: () => fetchFrames(search, 1, 500),
  })

  // Query SubBackboards for BOM composition dropdown options
  const { data: subBackboardsData } = useQuery({
    queryKey: ['subBackboards', 'all'],
    queryFn: () => fetchSubBackboards('', 1, 500),
  })

  const subBackboards = subBackboardsData?.items ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFrame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateFrameRequest }) => updateFrame(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames'] })
      setEditFrame(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetCreateForm = () => {
    setCreateCode('')
    setCreateDescription('')
    setCreateLines([{ subBackboardId: '', quantity: 1 }])
    setActionError(null)
  }

  const handleOpenEdit = (frame: FrameDto) => {
    setEditFrame(frame)
    setEditCode(frame.code.toString())
    setEditDescription(frame.description || '')
    setEditStatus(frame.status)
    setEditLines(
      frame.lines && frame.lines.length > 0
        ? frame.lines.map((l) => ({ subBackboardId: l.subBackboardId, quantity: l.quantity }))
        : [{ subBackboardId: '', quantity: 1 }],
    )
    setActionError(null)
  }

  // BOM Lines Helper functions for Create Form
  const handleAddCreateLine = () => {
    setCreateLines((prev) => [...prev, { subBackboardId: '', quantity: 1 }])
  }

  const handleRemoveCreateLine = (index: number) => {
    setCreateLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateLineChange = (
    index: number,
    field: 'subBackboardId' | 'quantity',
    value: number | '',
  ) => {
    setCreateLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // BOM Lines Helper functions for Edit Form
  const handleAddEditLine = () => {
    setEditLines((prev) => [...prev, { subBackboardId: '', quantity: 1 }])
  }

  const handleRemoveEditLine = (index: number) => {
    setEditLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEditLineChange = (
    index: number,
    field: 'subBackboardId' | 'quantity',
    value: number | '',
  ) => {
    setEditLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Submit Handler for Create
  const handleCreateSubmit = () => {
    setActionError(null)

    if (!createCode.trim()) {
      setActionError('Mã Rập là bắt buộc.')
      return
    }

    const parsedCode = Number(createCode)
    if (isNaN(parsedCode) || !Number.isInteger(parsedCode) || parsedCode <= 0) {
      setActionError('Mã Rập phải là số nguyên dương.')
      return
    }

    // Filter out lines with quantity <= 0 or empty subBackboardId
    const validLines = createLines.filter(
      (l) => typeof l.subBackboardId === 'number' && l.subBackboardId > 0 && typeof l.quantity === 'number' && l.quantity > 0,
    )

    // Check duplicate subBackboardId
    const selectedIds = validLines.map((l) => l.subBackboardId as number)
    if (new Set(selectedIds).size !== selectedIds.length) {
      setActionError('Không được chọn trùng cùng một tấm lưng phụ.')
      return
    }

    const payload: CreateFrameRequest = {
      code: parsedCode,
      description: createDescription.trim() || null,
      lines: validLines.map((l) => ({
        subBackboardId: l.subBackboardId as number,
        quantity: Math.floor(Number(l.quantity)),
      })),
    }

    createMutation.mutate(payload)
  }

  // Submit Handler for Edit
  const handleEditSubmit = () => {
    if (!editFrame) return
    setActionError(null)

    if (!editCode.trim()) {
      setActionError('Mã Rập là bắt buộc.')
      return
    }

    const parsedCode = Number(editCode)
    if (isNaN(parsedCode) || !Number.isInteger(parsedCode) || parsedCode <= 0) {
      setActionError('Mã Rập phải là số nguyên dương.')
      return
    }

    // Filter out lines with quantity <= 0 or empty subBackboardId
    const validLines = editLines.filter(
      (l) => typeof l.subBackboardId === 'number' && l.subBackboardId > 0 && typeof l.quantity === 'number' && l.quantity > 0,
    )

    // Check duplicate subBackboardId
    const selectedIds = validLines.map((l) => l.subBackboardId as number)
    if (new Set(selectedIds).size !== selectedIds.length) {
      setActionError('Không được chọn trùng cùng một tấm lưng phụ.')
      return
    }

    const payload: UpdateFrameRequest = {
      code: parsedCode,
      description: editDescription.trim() || null,
      status: editStatus,
      lines: validLines.map((l) => ({
        subBackboardId: l.subBackboardId as number,
        quantity: Math.floor(Number(l.quantity)),
      })),
    }

    updateMutation.mutate({ id: editFrame.id, req: payload })
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
      { field: 'code', headerName: 'MÃ RẬP', width: 150, filter: true, sortable: true },
      { field: 'description', headerName: 'MÔ TẢ RẬP', flex: 1, minWidth: 220 },
      {
        headerName: 'SỐ THÀNH PHẦN BOM',
        width: 180,
        type: 'rightAligned',
        valueGetter: (p) => p.data?.lines?.length ?? 0,
        cellRenderer: (p: { value: number }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <Chip
              label={`${p.value} thành phần`}
              size="small"
              sx={{
                bgcolor: p.value > 0 ? '#f0fdf4' : '#f5f5f5',
                color: p.value > 0 ? '#15803d' : '#737373',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: '4px',
              }}
            />
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 130,
        cellRenderer: (p: { value: number }) => (
          <Chip
            label={p.value === 1 ? 'Hoạt động' : 'Ngưng'}
            size="small"
            sx={{
              bgcolor: p.value === 1 ? '#f0fdf4' : '#fef2f2',
              color: p.value === 1 ? '#15803d' : '#b91c1c',
              fontSize: 12,
              borderRadius: '4px',
            }}
          />
        ),
      },
      {
        headerName: 'THAO TÁC',
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: FrameDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Sửa thông tin rập">
                <IconButton size="small" onClick={() => handleOpenEdit(p.data)} sx={{ color: '#404040' }}>
                  <Edit3 size={16} />
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
            Quản lý Rập ván
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Danh mục mã rập và cấu thành ván hậu (BOM).
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
            Thêm
          </Button>
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo mã rập..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Hiển thị: <strong>{data?.items.length ?? 0}</strong> / Tổng số: <strong>{data?.totalCount ?? 0}</strong> rập
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể lấy dữ liệu: {(error as Error).message}
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
          <AgGridReact<FrameDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            quickFilterText={search}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu rập</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
          />
        </div>
      </Paper>

      {/* CREATE FRAME DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Thêm rập mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÃ RẬP *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                placeholder="Nhập mã rập (ví dụ: 101)"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÔ TẢ RẬP
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Mô tả thông tin chi tiết rập..."
              />
            </Grid>

            {/* Cấu thành rập (BOM Lines) */}
            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid #ededed', pt: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                      Cấu thành rập (Chi tiết ván hậu)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#737373' }}>
                      Chọn các tấm lưng phụ và số lượng tương ứng cho rập
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Plus size={14} />}
                    onClick={handleAddCreateLine}
                    sx={{ color: '#171717', borderColor: '#e0e0e0' }}
                    variant="outlined"
                  >
                    Thêm dòng
                  </Button>
                </Box>

                {createLines.map((line, idx) => {
                  const selectedOtherIds = createLines
                    .filter((_, i) => i !== idx)
                    .map((l) => l.subBackboardId)

                  return (
                    <Grid container spacing={1.5} key={idx} sx={{ mb: 1.5, alignItems: 'center' }}>
                      <Grid item xs={7}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Tấm lưng phụ"
                          value={line.subBackboardId}
                          onChange={(e) =>
                            handleCreateLineChange(
                              idx,
                              'subBackboardId',
                              e.target.value === '' ? '' : Number(e.target.value),
                            )
                          }
                        >
                          <MenuItem value="">-- Chọn tấm lưng phụ --</MenuItem>
                          {subBackboards.map((sb) => (
                            <MenuItem
                              key={sb.id}
                              value={sb.id}
                              disabled={selectedOtherIds.includes(sb.id)}
                            >
                              {sb.size}
                              {sb.description ? ` (${sb.description})` : ''}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Số lượng"
                          inputProps={{ min: 1 }}
                          value={line.quantity}
                          onChange={(e) =>
                            handleCreateLineChange(
                              idx,
                              'quantity',
                              e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={1} sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveCreateLine(idx)}
                          disabled={createLines.length <= 1}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Grid>
                    </Grid>
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
            disabled={createMutation.isPending || !createCode.trim()}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT FRAME DIALOG */}
      <Dialog
        open={Boolean(editFrame)}
        onClose={() => setEditFrame(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Cập nhật rập: #{editFrame?.code}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÃ RẬP *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                TRẠNG THÁI *
              </Typography>
              <TextField
                select
                fullWidth
                value={editStatus}
                onChange={(e) => setEditStatus(Number(e.target.value))}
              >
                <MenuItem value={1}>Hoạt động</MenuItem>
                <MenuItem value={0}>Ngưng</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                MÔ TẢ RẬP
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Grid>

            {/* Cấu thành rập (BOM Lines) */}
            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid #ededed', pt: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                      Cấu thành rập (Chi tiết ván hậu)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#737373' }}>
                      Chọn các tấm lưng phụ và số lượng tương ứng cho rập
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Plus size={14} />}
                    onClick={handleAddEditLine}
                    sx={{ color: '#171717', borderColor: '#e0e0e0' }}
                    variant="outlined"
                  >
                    Thêm dòng
                  </Button>
                </Box>

                {editLines.map((line, idx) => {
                  const selectedOtherIds = editLines
                    .filter((_, i) => i !== idx)
                    .map((l) => l.subBackboardId)

                  return (
                    <Grid container spacing={1.5} key={idx} sx={{ mb: 1.5, alignItems: 'center' }}>
                      <Grid item xs={7}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Tấm lưng phụ"
                          value={line.subBackboardId}
                          onChange={(e) =>
                            handleEditLineChange(
                              idx,
                              'subBackboardId',
                              e.target.value === '' ? '' : Number(e.target.value),
                            )
                          }
                        >
                          <MenuItem value="">-- Chọn tấm lưng phụ --</MenuItem>
                          {subBackboards.map((sb) => (
                            <MenuItem
                              key={sb.id}
                              value={sb.id}
                              disabled={selectedOtherIds.includes(sb.id)}
                            >
                              {sb.size}
                              {sb.description ? ` (${sb.description})` : ''}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Số lượng"
                          inputProps={{ min: 1 }}
                          value={line.quantity}
                          onChange={(e) =>
                            handleEditLineChange(
                              idx,
                              'quantity',
                              e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={1} sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveEditLine(idx)}
                          disabled={editLines.length <= 1}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Grid>
                    </Grid>
                  )
                })}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditFrame(null)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={updateMutation.isPending || !editCode.trim()}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
