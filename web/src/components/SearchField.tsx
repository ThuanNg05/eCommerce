import { TextField, InputAdornment, IconButton, type TextFieldProps } from '@mui/material'
import { Search, X } from 'lucide-react'

export interface SearchFieldProps extends Omit<TextFieldProps, 'variant'> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  placeholder?: string
  width?: number | string
}

export default function SearchField({
  value,
  onChange,
  onClear,
  placeholder = 'Tìm kiếm...',
  width = 320,
  size = 'small',
  sx,
  ...props
}: SearchFieldProps) {
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      // Simulate synthetic clear event
      const event = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(event)
    }
  }

  return (
    <TextField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size={size}
      variant="outlined"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search size={16} color="#a3a3a3" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={handleClear}
              aria-label="Xóa tìm kiếm"
              edge="end"
              sx={{ color: '#a3a3a3', p: 0.5 }}
            >
              <X size={16} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{
        width,
        '& .MuiOutlinedInput-root': {
          borderRadius: '6px',
          bgcolor: '#ffffff',
        },
        ...sx,
      }}
      {...props}
    />
  )
}
