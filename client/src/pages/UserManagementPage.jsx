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

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { regions, loading: regionsLoading, error: regionsError } = useRegions();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

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
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      const res = await axios.get('/api/auth/users', config);
      if (res.data && res.data.success && res.data.data) {
        setUsers(res.data.data);
      } else {
        setUsers([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      const errorMessage = err.response?.data?.error || err.message || '获取用户列表失败';
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
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      await axios.put(`/api/auth/users/${userId}/role`, { role: newRole }, config);
      // Refresh users after role change
      fetchUsers();
    } catch (err) {
      setError('Failed to update user role.');
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
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      await axios.delete(`/api/auth/users/${selectedUser._id}`, config);
      // Refresh users after delete
      fetchUsers();
      handleClose();
    } catch (err) {
      setError('Failed to delete user.');
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
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
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
      <Box sx={{ mb: 2 }}>
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
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '& .MuiTable-root': {
            minWidth: 600
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150 }}>邮箱</TableCell>
              <TableCell sx={{ minWidth: 120 }}>单位名称</TableCell>
              <TableCell sx={{ minWidth: 120 }}>地区</TableCell>
              <TableCell sx={{ minWidth: 100 }}>角色</TableCell>
              <TableCell sx={{ minWidth: 80 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
                  <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{regionMap[user.region] ? `${regionMap[user.region]} (${user.region})` : user.region}</TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      >
                        <MenuItem value="admin">管理员</MenuItem>
                        <MenuItem value="editor">编辑员</MenuItem>
                        <MenuItem value="viewer">观察员</MenuItem>
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
