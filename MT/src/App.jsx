import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import MobileDashboard from './pages/MobileDashboard';
import ChartDetailPage from './pages/ChartDetailPage';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#66bb6a',
    },
    secondary: {
      main: '#42a5f5',
    },
    background: {
      default: '#0a0e27',
      paper: '#1a1f3a',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<MobileDashboard />} />
          <Route path="/chart/:chartType" element={<ChartDetailPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
