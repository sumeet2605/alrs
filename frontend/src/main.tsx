// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { AuthProvider } from './contexts/AuthContext.tsx'; // To be created next

// 1. Define a simple, custom MUI theme (you can elaborate on this later)
const customMuiTheme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5', // A nice blue for primary actions (MUI default-ish)
    },
    secondary: {
      main: '#f50057', // A strong accent color
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      'sans-serif',
    ].join(','),
  },
});

// 2. Define a simple AntD theme to match MUI (optional but good practice)
const customAntdTheme = {
  token: {
    colorPrimary: '#3f51b5',
    borderRadius: 8,
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 3. Wrap with MUI ThemeProvider */}
      <ThemeProvider theme={customMuiTheme}>
        {/* 4. Wrap with AntD ConfigProvider */}
        <ConfigProvider theme={customAntdTheme}>
          {/* 5. Wrap with AuthProvider for state management */}
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfigProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);