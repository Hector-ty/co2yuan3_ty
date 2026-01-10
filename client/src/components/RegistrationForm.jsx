import React, { useState } from 'react';
import {
  TextField, Button, Box, CircularProgress, Alert, Grid, Link
} from '@mui/material';
import RegionSelector from './RegionSelector';

const RegistrationForm = ({ onRegister, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unitName, setUnitName] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onRegister({ email, password, unitName, region });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
        name="unitName"
        label="单位名称"
        id="unitName"
        value={unitName}
        onChange={(e) => setUnitName(e.target.value)}
      />
      <RegionSelector
        value={region}
        onChange={(e) => setRegion(e.target.value)}
      />
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
