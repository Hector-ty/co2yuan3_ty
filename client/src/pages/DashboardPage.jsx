import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Typography, Button, Card, CardContent, CardHeader,
  AppBar, Toolbar, Tabs, Tab, Box, Collapse, Alert, Snackbar, useMediaQuery, useTheme, Menu, MenuItem, IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Logout, Menu as MenuIcon } from '@mui/icons-material';
import { useCarbonData } from '../hooks/useCarbonData';
import { useRegions } from '../hooks/useRegions';
import DataEntryTab from '../components/DataEntryTab';
import HistoricalDataTable from '../components/HistoricalDataTable';
import SearchBar from '../components/SearchBar';
import CarbonReportExportTab from '../components/CarbonReportExportTab';
import EmissionMapChart from '../components/charts/EmissionMapChart';
import UserManagementPage from './UserManagementPage'; // Import the new page
import AccountManagement from '../components/AccountManagement';
import ErrorBoundary from '../components/ErrorBoundary';
import TeachingVideosTab from '../components/TeachingVideosTab';

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
    handleBatchDelete,
    handleSaveEdit,
    handleFormSubmit,
    handleExport,
    page,
    pageSize,
    total,
    handlePageChange,
    handlePageSizeChange,
  } = useCarbonData();

  const { regions } = useRegions();
  const [activeTab, setActiveTab] = useState(0);
  const [showHistory, setShowHistory] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  useEffect(() => {
    // Retrieve user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    console.log('Dashboard - 当前用户:', user);
    console.log('Dashboard - 用户角色:', user?.role);
    setCurrentUser(user);
    
    // 如果当前用户没有数据填报权限，且activeTab为0，则切换到历史提交记录（value=1）
    // 如果当前用户是机构用户，且activeTab为2（数据地图），则切换到历史提交记录（value=1）
    if (user) {
      // 使用函数形式的setState来确保获取最新的activeTab值
      setActiveTab(prevTab => {
        if (user.role !== 'organization_user' && user.role !== 'superadmin' && prevTab === 0) {
          return 1; // 非机构用户且非超级管理员没有数据填报权限，切换到历史提交记录
        }
        if (user.role === 'organization_user' && prevTab === 3) {
          return 1; // 机构用户没有数据地图权限，切换到历史提交记录
        }
        // 机构级用户没有“导出碳排放报告”模块权限，如果当前在该标签页，则切回历史记录
        if (user.role === 'organization_user' && prevTab === 2) {
          return 1;
        }
        return prevTab;
      });
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
  };

  // 判断是否为管理员角色（可以访问权限管理）
  // 包括：超级管理员（superadmin）、省级管理员、市级管理员、区县级管理员
  // 特别注意：超级管理员（邮箱为root@root.com，角色为superadmin）必须能访问权限管理模块
  const isAdmin = currentUser && ['superadmin', 'province_admin', 'city_admin', 'district_admin'].includes(currentUser.role);
  // 判断是否可以访问数据填报模块（机构用户和超级管理员可以访问）
  const canAccessDataEntry = currentUser && (currentUser.role === 'organization_user' || currentUser.role === 'superadmin');
  // 判断是否可以访问数据地图模块（机构用户隐藏此模块）
  const canAccessMap = currentUser && currentUser.role !== 'organization_user';
  // 判断是否可以访问“导出碳排放报告”模块：机构级用户隐藏该模块
  const canAccessExportReport = currentUser && currentUser.role !== 'organization_user';
  
  // 构建标签页列表
  const tabs = [];
  
  // 数据填报 - 机构用户和超级管理员可以访问
  if (canAccessDataEntry) {
    tabs.push({ label: '数据填报', value: 0 });
  }
  
  // 历史提交记录 - 所有角色都可以访问
  tabs.push({ label: '历史提交记录', value: 1 });
  
  // 导出碳排放报告 - 机构级用户隐藏该模块
  if (canAccessExportReport) {
    tabs.push({ label: '导出碳排放报告', value: 2 });
  }
  
  // 数据地图 - 机构用户隐藏此模块
  if (canAccessMap) {
    tabs.push({ label: '数据地图', value: 3 });
  }
  
  // 数据大屏 - 所有角色都可以访问
  tabs.push({ label: '数据大屏', value: 4, link: '/data-screen' });
  
  // 个人账号管理 - 所有角色都可以访问
  tabs.push({ label: '个人账号管理', value: 5 });
  
  // 权限管理 - 只有管理员角色可以访问（机构用户隐藏）
  if (isAdmin) {
    tabs.push({ label: '权限管理', value: 6 });
  }
  
  // 教学视频 - 所有角色都可以访问
  tabs.push({ label: '教学视频', value: 7 });
  
  useEffect(() => {
    console.log('Dashboard - 当前用户:', currentUser);
    console.log('Dashboard - isAdmin:', isAdmin);
    console.log('Dashboard - canAccessDataEntry:', canAccessDataEntry);
    console.log('Dashboard - tabs:', tabs);
    console.log('Dashboard - activeTab:', activeTab);
  }, [currentUser, isAdmin, canAccessDataEntry, activeTab, tabs]);

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

      <Container 
        maxWidth={activeTab === 6 && isAdmin ? false : 'xl'} 
        sx={{ 
          mt: { xs: 2, sm: 4 }, 
          mb: { xs: 2, sm: 4 }, 
          px: { xs: activeTab === 6 && isAdmin ? 0 : 1, sm: activeTab === 6 && isAdmin ? 2 : 3 },
          width: '100%'
        }}
      >
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {/* 数据提交成功的提示显示在页面底部，其余成功提示在顶部 */}
        {success && success !== '数据提交成功!' && (
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>
        )}
        <Snackbar
          open={success === '数据提交成功!'}
          autoHideDuration={3000}
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

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
              {canAccessDataEntry && <Tab label="数据填报" value={0} />}
              <Tab label="历史提交记录" value={1} />
              {canAccessExportReport && <Tab label="导出碳排放报告" value={2} />}
              {canAccessMap && <Tab label="数据地图" value={3} />}
              <Tab label="数据大屏" value={4} component={Link} to="/data-screen" />
              <Tab label="个人账号管理" value={5} />
              {isAdmin && <Tab label="权限管理" value={6} />}
              <Tab label="教学视频" value={7} />
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
            {activeTab === 0 && canAccessDataEntry && (
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
                        onDelete={handleDelete}
                        onBatchDelete={handleBatchDelete}
                        onSaveEdit={handleSaveEdit}
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                      />
                    </CardContent>
                  </Collapse>
                </Card>
              </Box>
            )}
            {activeTab === 2 && canAccessExportReport && (
              <CarbonReportExportTab regions={regions} />
            )}
            {activeTab === 3 && canAccessMap && (
              <Card>
                <CardHeader title="排放地图" />
                <CardContent sx={{ 
                  height: { xs: '60vh', md: '80vh' }, 
                  p: { xs: 1, sm: 2 },
                  pb: { xs: 2, sm: 2.5 }, // 增加底部padding，确保下边界可见
                  overflow: 'hidden', // 防止地图内容超出容器
                  position: 'relative'
                }}>
                  <ErrorBoundary title="排放地图加载失败" message="很抱歉，加载排放地图时出现问题。请稍后重试。">
                    <EmissionMapChart />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            )}
            {activeTab === 5 && (
              <AccountManagement />
            )}
            {activeTab === 6 && isAdmin && (
              <UserManagementPage />
            )}
            {activeTab === 7 && (
              <TeachingVideosTab />
            )}
          </MotionBox>
        </AnimatePresence>
      </Container>
    </Box>
  );
};

export default DashboardPage;
