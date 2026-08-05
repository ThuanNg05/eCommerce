import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  shape: { borderRadius: 6 },
  palette: {
    mode: 'light',
    background: { default: '#f9f9f9', paper: '#ffffff' },
    primary: { main: '#1a1a1a', light: '#404040', dark: '#000000' },
    secondary: { main: '#7299ED', light: '#EEF3FD' },
    text: { primary: '#171717', secondary: '#737373', disabled: '#a3a3a3' },
    divider: '#ededed',
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          height: 36,
          padding: '0 16px',
        },
        containedPrimary: {
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#000000',
          },
        },
        outlined: {
          borderColor: '#e0e0e0',
          color: '#171717',
          '&:hover': {
            backgroundColor: '#f2f2f2',
            borderColor: '#e0e0e0',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #ededed',
          borderRadius: 8,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#171717',
          borderBottom: '1px solid #ededed',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: '#ffffff',
            '& fieldset': { borderColor: '#e0e0e0' },
            '&:hover fieldset': { borderColor: '#a3a3a3' },
            '&.Mui-focused fieldset': { borderColor: '#7299ED', borderWidth: 1 },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
        },
      },
    },
  },
})
