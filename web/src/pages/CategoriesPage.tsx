import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Plus, RefreshCw, Edit3 } from 'lucide-react'
import SearchField from '../components/SearchField'
import { fetchCategories, createCategory, updateCategory, type CategoryDto } from '../api/categories'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null)
  const [formName, setFormName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => fetchCategories(search),
  })

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      handleCloseDialog()
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      handleCloseDialog()
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  const handleOpenCreate = () => {
    setFormName('')
    setFormError(null)
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (category: CategoryDto) => {
    setEditingCategory(category)
    setFormName(category.name)
    setFormError(null)
  }

  const handleCloseDialog = () => {
    setIsCreateOpen(false)
    setEditingCategory(null)
    setFormName('')
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      setFormError('Tên danh mục không được để trống.')
      return
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, name: formName.trim() })
    } else {
      createMutation.mutate(formName.trim())
    }
  }

  const columns = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'STT',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        sortable: false,
        filter: false,
      },
      { field: 'id', headerName: 'ID', width: 90, sortable: true },
      { field: 'name', headerName: 'TÊN DANH MỤC', flex: 1, minWidth: 220, filter: true, sortable: true },
      {
        field: 'createdAt',
        headerName: 'NGÀY TẠO',
        width: 180,
        sortable: true,
        valueFormatter: (p) =>
          p.value
            ? new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(p.value))
            : '—',
      },
      {
        headerName: 'THAO TÁC',
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: CategoryDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Chỉnh sửa danh mục">
                <IconButton
                  size="small"
                  onClick={() => handleOpenEdit(p.data)}
                  sx={{ color: '#171717', '&:hover': { bgcolor: '#f2f2f2' } }}
                >
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
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
            onClick={handleOpenCreate}
            startIcon={<Plus size={16} />}
            sx={{ height: 36, bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
          >
            Thêm mới
          </Button>
        </Box>
      </Box>

      {/* Filter / Search */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <SearchField
          placeholder="Tìm tên danh mục..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          width={320}
        />
      </Paper>

      {/* Grid Container */}
      <Paper elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px', overflow: 'hidden', height: 'calc(100vh - 290px)' }}>
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<CategoryDto>
            rowData={data?.items ?? []}
            columnDefs={columns}
            loading={isLoading}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Chưa có dữ liệu</span>'
            pagination
          />
        </div>
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || Boolean(editingCategory)}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
            {editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục Mới'}
          </DialogTitle>

          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
                {formError}
              </Alert>
            )}

            <TextField
              autoFocus
              fullWidth
              label="Tên danh mục *"
              placeholder="VD: Khung gỗ, Kính cường lực..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseDialog} variant="outlined" color="inherit" disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ bgcolor: '#1a1a1a', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
            >
              {editingCategory ? 'Cập nhật' : 'Lưu'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
