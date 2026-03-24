import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Alert,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { useRegions } from '../hooks/useRegions';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const AccountManagement = () => {
  const { regions, loading: regionsLoading } = useRegions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userInfo, setUserInfo] = useState({
    email: '',
    region: '',
    unitName: '',
    unitType: '',
    creditCode: '',
    address: '',
    buildingArea: '',
    personnelCount: '',
    contactPerson: '',
    contactPhone: ''
  });

  useEffect(() => {
    // 从 localStorage 获取用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserInfo({
        email: user.email || '',
        region: user.region || '',
        unitName: user.unitName || '',
        unitType: user.unitType || '',
        creditCode: user.creditCode || '',
        address: user.address || '',
        buildingArea: user.buildingArea || '',
        personnelCount: user.personnelCount || '',
        contactPerson: user.contactPerson || '',
        contactPhone: user.contactPhone || ''
      });
    }
  }, []);

  const handleChange = (field) => (event) => {
    setUserInfo({
      ...userInfo,
      [field]: event.target.value
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 获取当前用户ID
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        setError('请先登录');
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const userId = user.id;

      // 准备更新数据（不包含个人基本信息，因为它们是只读的）；未填写单位类型时使用默认值
      const unitTypeValue = (userInfo.unitType && userInfo.unitType.trim()) ? userInfo.unitType.trim() : '默认单位类型';
      const updateData = {
        unitName: userInfo.unitName,
        unitType: unitTypeValue,
        creditCode: userInfo.creditCode,
        address: userInfo.address,
        buildingArea: userInfo.buildingArea ? parseFloat(userInfo.buildingArea) : 0,
        personnelCount: userInfo.personnelCount ? parseInt(userInfo.personnelCount) : 0,
        contactPerson: userInfo.contactPerson,
        contactPhone: userInfo.contactPhone
      };

      // 调用后端API更新用户信息
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/auth/users/${userId}/profile`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // 更新 localStorage 中的用户信息（不更新个人基本信息）
        const updatedUser = {
          ...user,
          unitName: updateData.unitName,
          unitType: updateData.unitType,
          creditCode: updateData.creditCode,
          address: updateData.address,
          buildingArea: updateData.buildingArea,
          personnelCount: updateData.personnelCount,
          contactPerson: updateData.contactPerson,
          contactPhone: updateData.contactPhone
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setSuccess('账号信息更新成功');
        // 触发自定义事件，通知其他组件更新
        window.dispatchEvent(new Event('userInfoUpdated'));
      }
    } catch (err) {
      console.error('更新账号信息失败:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '更新账号信息失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="个人账号管理" />
      <CardContent>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 个人基本信息 */}
            <Box sx={{ width: '100%' }}>
              <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 600 }}>
                  个人基本信息
                </Typography>
                
                <TextField
                  fullWidth
                  label="邮箱"
                  type="email"
                  value={userInfo.email}
                  disabled
                  margin="normal"
                  variant="outlined"
                  helperText="邮箱不可修改"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="密码"
                  type="password"
                  value="********"
                  disabled
                  margin="normal"
                  variant="outlined"
                  helperText="密码不可修改"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="地区"
                  value={(() => {
                    if (!regions || regions.length === 0) {
                      return userInfo.region || '加载中...';
                    }
                    const selectedRegion = regions.flatMap(c => [c, ...(c.children || [])]).find(r => r.code === userInfo.region);
                    return selectedRegion ? selectedRegion.name : userInfo.region;
                  })()}
                  disabled
                  margin="normal"
                  variant="outlined"
                  helperText="地区不可修改"
                  sx={{ mb: 2 }}
                />
              </Card>
            </Box>

            {/* 单位基本信息 */}
            <Box sx={{ width: '100%' }}>
              <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 600 }}>
                  单位基本信息
                </Typography>

                <TextField
                  fullWidth
                  required
                  label="单位名称"
                  value={userInfo.unitName}
                  onChange={handleChange('unitName')}
                  margin="normal"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="单位类型"
                  value={userInfo.unitType}
                  onChange={handleChange('unitType')}
                  margin="normal"
                  variant="outlined"
                  placeholder="未填写则保存为「默认单位类型」"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  label="统一社会信用代码"
                  value={userInfo.creditCode}
                  onChange={handleChange('creditCode')}
                  margin="normal"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  label="详细地址"
                  value={userInfo.address}
                  onChange={handleChange('address')}
                  margin="normal"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  label="建筑面积(平方米)"
                  type="number"
                  value={userInfo.buildingArea}
                  onChange={handleChange('buildingArea')}
                  margin="normal"
                  variant="outlined"
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  label="用能人数(人)"
                  type="number"
                  value={userInfo.personnelCount}
                  onChange={handleChange('personnelCount')}
                  margin="normal"
                  variant="outlined"
                  inputProps={{ min: 0, step: 1 }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  label="填报联系人"
                  value={userInfo.contactPerson}
                  onChange={handleChange('contactPerson')}
                  margin="normal"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  label="联系电话"
                  value={userInfo.contactPhone}
                  onChange={handleChange('contactPhone')}
                  margin="normal"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              </Card>
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-start' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : '保存修改'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                // 重置表单
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                  const user = JSON.parse(storedUser);
                  setUserInfo({
                    email: user.email || '',
                    region: user.region || '',
                    unitName: user.unitName || '',
                    unitType: user.unitType || '',
                    creditCode: user.creditCode || '',
                    address: user.address || '',
                    buildingArea: user.buildingArea || '',
                    personnelCount: user.personnelCount || '',
                    contactPerson: user.contactPerson || '',
                    contactPhone: user.contactPhone || ''
                  });
                }
                setError('');
                setSuccess('');
              }}
              sx={{ minWidth: 120 }}
            >
              重置
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AccountManagement;
