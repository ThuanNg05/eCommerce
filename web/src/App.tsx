import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { fetchInventory, type ProductDto } from './api/inventory'

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value ?? 0)

export default function App() {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => fetchInventory(search),
  })

  const columns = useMemo<ColDef<ProductDto>[]>(
    () => [
      { field: 'sku', headerName: 'SKU', filter: true, sortable: true, width: 150 },
      { field: 'name', headerName: 'Name', filter: true, sortable: true, flex: 1, minWidth: 200 },
      {
        field: 'unitPrice',
        headerName: 'Unit Price',
        type: 'rightAligned',
        width: 140,
        valueFormatter: (p: ValueFormatterParams<ProductDto, number>) => currency(p.value ?? 0),
      },
      { field: 'quantityOnHand', headerName: 'On Hand', type: 'rightAligned', width: 120 },
      { field: 'reorderLevel', headerName: 'Reorder', type: 'rightAligned', width: 120 },
      {
        field: 'isActive',
        headerName: 'Active',
        width: 110,
        valueFormatter: (p: ValueFormatterParams<ProductDto, boolean>) => (p.value ? 'Yes' : 'No'),
      },
    ],
    [],
  )

  return (
    <Box className="flex flex-col h-screen">
      <AppBar position="static">
        <Toolbar className="gap-4">
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Warehouse &amp; Invoicing
          </Typography>
          <Chip size="small" label={`${data?.totalCount ?? 0} items`} />
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search SKU or name…"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ bgcolor: 'background.paper', borderRadius: 1, width: 300 }}
          />
        </Toolbar>
      </AppBar>

      <Box className="flex-1 p-3">
        {isError && (
          <div className="text-red-600 p-3">Failed to load inventory: {(error as Error).message}</div>
        )}
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
      </Box>
    </Box>
  )
}
