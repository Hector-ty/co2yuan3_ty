import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Typography, Button, Card, CardContent, CardHeader,
  AppBar, Toolbar, Tabs, Tab, Box, Collapse, Alert, useMediaQuery, useTheme, Menu, MenuItem, IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Logout, Menu as MenuIcon } from '@mui/icons-material';
import { useCarbonData } from '../hooks/useCarbonData';
import { useRegions } from '../hooks/useRegions';
import DataEntryTab from '../components/DataEntryTab';
import HistoricalDataTable from '../components/HistoricalDataTable';
import ChartAnalysis from '../components/ChartAnalysis';
import SearchBar from '../components/SearchBar';
import EmissionMapChart from '../components/charts/EmissionMapChart';
import UserManagementPage from './UserManagementPage'; // Import the new page

const MotionBox = motion(Box);

const DashboardPage = ({ onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    submittedData,
    allSubmittedData,
    loadingData,
    error,
    success,
    setError,
    setSuccess,
    handleSearch,
    handleDelete,
    handleSaveEdit,
    handleFormSubmit,
    handleExport,
  } = useCarbonData();

  const { regions } = useRegions();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  useEffect(() => {
    // Retrieve user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedRecord(null);
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setTimeout(() => {
      document.getElementById('chart-analysis-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleMenuTabChange = (newValue) => {
    setActiveTab(newValue);
    handleMenuClose();
    setSelectedRecord(null);
  };

  const isRoot = currentUser && currentUser.role === 'admin';
  
  const tabs = [
    { label: '数据填报', value: 0 },
    { label: '历史提交记录', value: 1 },
    { label: '数据地图', value: 2 },
    { label: '数据大屏', value: 3, link: '/data-screen' },
    ...(isRoot ? [{ label: '排放因子管理', value: 4, link: '/emission-factors' }] : []),
    ...(isRoot ? [{ label: '权限管理', value: 5 }] : [])
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            碳排放数据监测系统
          </Typography>
          {isMobile ? (
            <IconButton color="inherit" onClick={handleMenuOpen}>
              <MenuIcon />
            </IconButton>
          ) : (
            <Button color="inherit" startIcon={<Logout />} onClick={onLogout} size="small">
              退出登录
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        {isMobile ? (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleMenuOpen}
              endIcon={<MenuIcon />}
              sx={{ mb: 2 }}
            >
              {tabs.find(t => t.value === activeTab)?.label || '选择功能'}
            </Button>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              {tabs.map((tab) => (
                <MenuItem
                  key={tab.value}
                  onClick={() => {
                    if (tab.link) {
                      window.location.href = tab.link;
                    } else {
                      handleMenuTabChange(tab.value);
                    }
                  }}
                >
                  {tab.label}
                </MenuItem>
              ))}
              <MenuItem onClick={onLogout}>
                <Logout sx={{ mr: 1 }} /> 退出登录
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant={isMobile ? 'scrollable' : 'standard'}
              scrollButtons="auto"
              sx={{ 
                minHeight: { xs: 48, sm: 64 },
                '& .MuiTabs-flexContainer': {
                  justifyContent: 'center' // 居中显示所有Tab按钮
                }
              }}
            >
              <Tab label="数据填报" />
              <Tab label="历史提交记录" />
              <Tab label="数据地图" />
              <Tab label="数据大屏" component={Link} to="/data-screen" />
              {isRoot && <Tab label="排放因子管理" component={Link} to="/emission-factors" />}
              {isRoot && <Tab label="权限管理" />}
            </Tabs>
          </Box>
        )}

        <AnimatePresence mode="wait">
          <MotionBox
            key={activeTab}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 0 && (
              <DataEntryTab regions={regions} onSubmit={handleFormSubmit} />
            )}

            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Card>
                  <CardHeader
                    title="历史提交数据"
                    action={
                      <Button onClick={() => setShowHistory(!showHistory)}>
                        {showHistory ? '隐藏历史记录' : '显示历史记录'}
                      </Button>
                    }
                  />
                  <Collapse in={showHistory}>
                    <CardContent>
                      <SearchBar
                        regions={regions}
                        onSearch={handleSearch}
                        onExport={handleExport}
                        isExportDisabled={submittedData.length === 0}
                      />
                      <HistoricalDataTable
                        data={submittedData}
                        loading={loadingData}
                        onSelect={handleSelectRecord}
                        onDelete={handleDelete}
                        onSaveEdit={handleSaveEdit}
                      />
                    </CardContent>
                  </Collapse>
                </Card>

                <ChartAnalysis
                  selectedRecord={selectedRecord}
                  allData={allSubmittedData}
                />
              </Box>
            )}
            {activeTab === 2 && (
              <Card>
                <CardHeader title="排放地图" />
                <CardContent sx={{ 
                  height: { xs: '60vh', md: '80vh' }, 
                  p: { xs: 1, sm: 2 },
                  pb: { xs: 2, sm: 2.5 }, // 增加底部padding，确保下边界可见
                  overflow: 'hidden', // 防止地图内容超出容器
                  position: 'relative'
                }}>
                  <EmissionMapChart />
                </CardContent>
              </Card>
            )}
            {activeTab === 5 && isRoot && (
              <UserManagementPage />
            )}
          </MotionBox>
        </AnimatePresence>
      </Container>
    </Box>
  );
};

export default DashboardPage;
