import React, { useState } from 'react';
import {
  TextField, Button, Box, CircularProgress, Alert, Grid, Link, Typography, Paper
} from '@mui/material';
import RegionSelector from './RegionSelector';

const RegistrationForm = ({ onRegister, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [unitName, setUnitName] = useState('');
  const [creditCode, setCreditCode] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [buildingArea, setBuildingArea] = useState('');
  const [personnelCount, setPersonnelCount] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // 验证密码和确认密码是否一致
    if (password !== confirmPassword) {
      setError('密码和确认密码不一致，请重新填写');
      setLoading(false);
      // 清空密码和确认密码，让用户重新填写
      setPassword('');
      setConfirmPassword('');
      return;
    }
    
    try {
      await onRegister({ 
        email, 
        password, 
        unitName, 
        creditCode,
        region, 
        address,
        buildingArea: buildingArea ? parseFloat(buildingArea) : undefined,
        personnelCount: personnelCount ? parseInt(personnelCount) : undefined,
        contactPerson,
        contactPhone
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={{ xs: 2, sm: 2 }} sx={{ width: '100%' }}>
        {/* 左侧：个人基本信息 */}
        <Grid item xs={12} sm={6} sx={{ display: 'flex', width: '100%' }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 2, sm: 3 },
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                fontSize: { xs: '1rem', sm: '1.125rem' },
                fontWeight: 600
              }}
            >
              个人基本信息
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="邮箱"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密码"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="确认密码"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Paper>
        </Grid>

        {/* 右侧：单位基本信息 */}
        <Grid item xs={12} sm={6} sx={{ display: 'flex', width: '100%' }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 2, sm: 3 },
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                fontSize: { xs: '1rem', sm: '1.125rem' },
                fontWeight: 600
              }}
            >
              单位基本信息
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              name="unitName"
              label="单位名称"
              id="unitName"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="creditCode"
              label="统一社会信用代码"
              id="creditCode"
              value={creditCode}
              onChange={(e) => setCreditCode(e.target.value)}
            />
            <RegionSelector
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="address"
              label="详细地址"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="buildingArea"
              label="建筑面积(平方米)"
              id="buildingArea"
              type="number"
              value={buildingArea}
              onChange={(e) => setBuildingArea(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="personnelCount"
              label="用能人数(人)"
              id="personnelCount"
              type="number"
              value={personnelCount}
              onChange={(e) => setPersonnelCount(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="contactPerson"
              label="填报联系人"
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="contactPhone"
              label="联系电话"
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Paper>
        </Grid>
      </Grid>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : '注册'}
      </Button>
      <Grid container justifyContent="flex-end">
        <Grid item>
          <Link href="#" variant="body2" onClick={onSwitchToLogin}>
            已有账号? 登录
          </Link>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RegistrationForm;
