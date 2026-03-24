import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Button,
  Typography,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useRegions } from '../hooks/useRegions';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { regions, loading: regionsLoading, error: regionsError } = useRegions();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // 获取当前登录用户的角色
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    setCurrentUserRole(user?.role || null);
  }, []);

  // 根据当前用户角色获取允许的角色列表
  const getAllowedRoles = () => {
    if (!currentUserRole) return [];
    
    // 超级管理员可以设置所有角色
    if (currentUserRole === 'superadmin') {
      return [
        { value: 'superadmin', label: '超级管理员' },
        { value: 'province_admin', label: '省级管理员' },
        { value: 'city_admin', label: '市级管理员' },
        { value: 'district_admin', label: '区县级管理员' },
        { value: 'organization_user', label: '机构用户' }
      ];
    }
    
    // 省级管理员：可以设置 省级管理员、市级管理员、区县级管理员、机构用户
    if (currentUserRole === 'province_admin') {
      return [
        { value: 'province_admin', label: '省级管理员' },
        { value: 'city_admin', label: '市级管理员' },
        { value: 'district_admin', label: '区县级管理员' },
        { value: 'organization_user', label: '机构用户' }
      ];
    }
    
    // 市级管理员：可以设置 市级管理员、区县级管理员、机构用户
    if (currentUserRole === 'city_admin') {
      return [
        { value: 'city_admin', label: '市级管理员' },
        { value: 'district_admin', label: '区县级管理员' },
        { value: 'organization_user', label: '机构用户' }
      ];
    }
    
    // 区县级管理员：可以设置 区县级管理员、机构用户
    if (currentUserRole === 'district_admin') {
      return [
        { value: 'district_admin', label: '区县级管理员' },
        { value: 'organization_user', label: '机构用户' }
      ];
    }
    
    // 其他角色或未知角色，返回空数组
    return [];
  };

  const regionMap = useMemo(() => {
    if (!regions || regions.length === 0) return {};
    const map = {};
    const traverse = (node) => {
      map[node.code] = node.name;
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    regions.forEach(traverse);
    return map;
  }, [regions]);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const filtered = users.filter(user => {
      const unitNameMatch = user.unitName?.toLowerCase().includes(lowercasedSearchTerm);
      const regionName = regionMap[user.region] || '';
      const regionMatch = regionName.toLowerCase().includes(lowercasedSearchTerm);
      return unitNameMatch || regionMatch;
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users, regionMap]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('未登录，请先登录');
        setLoading(false);
        return;
      }
      // 使用统一的 API_BASE_URL，axios 拦截器会自动添加 Authorization header
      const res = await axios.get(`${API_BASE_URL}/auth/users`);
      console.log('获取用户列表响应:', res.data); // 添加调试日志
      if (res.data && res.data.success && res.data.data) {
        // 过滤掉 root 用户（如果存在）
        const filteredUsers = res.data.data.filter(user => user.email !== 'root@root.com');
        setUsers(filteredUsers);
        console.log('设置用户列表:', filteredUsers); // 添加调试日志
      } else {
        console.warn('响应数据格式不正确:', res.data);
        setUsers([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      console.error('错误详情:', err.response?.data); // 添加详细错误日志
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '获取用户列表失败';
      setError(errorMessage);
      setUsers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      // 使用统一的 API_BASE_URL，axios 拦截器会自动添加 Authorization header
      await axios.put(`${API_BASE_URL}/auth/users/${userId}/role`, { role: newRole });
      // Refresh users after role change
      fetchUsers();
    } catch (err) {
      console.error('更新用户角色失败:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || '更新用户角色失败';
      setError(errorMessage);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      // 使用统一的 API_BASE_URL，axios 拦截器会自动添加 Authorization header
      await axios.delete(`${API_BASE_URL}/auth/users/${selectedUser._id}`);
      // Refresh users after delete
      fetchUsers();
      handleClose();
    } catch (err) {
      console.error('删除用户失败:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || '删除用户失败';
      setError(errorMessage);
    }
  };

  if (loading || regionsLoading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 3 }, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 3 },
      width: '100%',
      maxWidth: '100%',
      minWidth: 0, // 允许收缩到最小
      boxSizing: 'border-box' // 确保padding包含在宽度内
    }}>
      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        用户权限管理
      </Typography>
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error" variant="body2">{error}</Typography>
          <Button variant="outlined" size="small" onClick={fetchUsers} sx={{ mt: 1 }}>
            重试
          </Button>
        </Box>
      )}
      {regionsError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography color="warning.dark" variant="body2">加载地区数据失败，地区名称可能无法显示</Typography>
        </Box>
      )}
      <Box sx={{ mb: 2, width: '100%' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="按单位名称或地区搜索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <TableContainer 
        component={Paper}
        sx={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'visible', // 移除横向滚动，改为可见
          '& .MuiTable-root': {
            width: '100%',
            tableLayout: 'auto' // 自动表格布局，让列宽自适应
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '10%' }}>邮箱</TableCell>
              <TableCell sx={{ width: '10%' }}>单位名称</TableCell>
              <TableCell sx={{ width: '10%' }}>统一社会信用代码</TableCell>
              <TableCell sx={{ width: '10%' }}>地区</TableCell>
              <TableCell sx={{ width: '12%' }}>详细地址</TableCell>
              <TableCell sx={{ width: '8%' }}>建筑面积(m²)</TableCell>
              <TableCell sx={{ width: '8%' }}>用能人数(人)</TableCell>
              <TableCell sx={{ width: '8%' }}>填报联系人</TableCell>
              <TableCell sx={{ width: '10%' }}>联系电话</TableCell>
              <TableCell sx={{ width: '8%' }}>角色</TableCell>
              <TableCell sx={{ width: '6%' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? '加载中...' : searchTerm ? '未找到匹配的用户' : '暂无用户数据'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.email}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.unitName}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.creditCode || '-'}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{regionMap[user.region] ? `${regionMap[user.region]} (${user.region})` : user.region}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.address || '-'}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.buildingArea || '-'}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.personnelCount || '-'}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.contactPerson || '-'}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.contactPhone || '-'}</TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 300,
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              backdropFilter: 'blur(10px)',
                              color: 'white',
                            },
                          },
                        }}
                        sx={{
                          color: 'white',
                          '& .MuiSelect-select': {
                            color: 'white',
                          },
                          '& .MuiSelect-icon': {
                            color: 'white',
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
                          '& .MuiOutlinedInput-input': {
                            color: 'white',
                          },
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.6)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#66bb6a',
                          },
                          '.MuiSvgIcon-root': {
                            color: 'white',
                          },
                        }}
                      >
                        {getAllowedRoles().map((role) => (
                          <MenuItem key={role.value} value={role.value} sx={{ color: 'white' }}>
                            {role.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleDeleteClick(user)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您确定要删除用户 {selectedUser?.email} 吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="primary" autoFocus>
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;
