import React, { useState } from 'react';
import {
  TextField, Button, Box, CircularProgress, Alert, Grid, Link
} from '@mui/material';

const LoginForm = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // This logic will be passed in via onLogin prop from the parent LoginPage
      await onLogin({ email, password });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="密码 (6位)"
        type="password"
        id="password"
        autoComplete="off"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : '登录'}
      </Button>
      <Grid container justifyContent="flex-end">
        <Grid item>
          <Link href="#" variant="body2" onClick={onSwitchToRegister}>
            还没有账号? 注册
          </Link>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoginForm;
