import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const EmissionFactorManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingFactor, setEditingFactor] = useState(null); // Factor being edited
  const [openDialog, setOpenDialog] = useState(false); // For add/edit dialog
  const [currentFactor, setCurrentFactor] = useState({ // Factor data in dialog
    category: '',
    type: '',
    name: '',
    value: '',
    unit: '',
    description: ''
  });

  const categories = [
    { value: 'solid', label: '固体燃料' },
    { value: 'liquid', label: '液体燃料' },
    { value: 'gas', label: '气体燃料' },
    { value: 'indirect', label: '间接排放' },
    { value: 'mobile', label: '移动源' }
  ];
  const mobileTypes = [
    { value: 'fuel', label: '燃料' },
    { value: 'mileage', label: '里程' }
  ];

  // 定义可用的单位选项
  const unitOptions = {
    solid: ['tCO2/t'],
    liquid: ['tCO2/t', 'tCO2/L'],
    gas: ['tCO2/10^4 Nm^3'],
    indirect: {
      electricity: ['tCO2/MWh'],
      heat: ['kgCO2e/GJ']
    },
    mobile: {
      fuel: ['kgCO2/L'],
      mileage: ['kgCO2/km']
    }
  };

  // 根据类别和类型获取单位选项
  const getUnitsForCategoryAndType = (category, type) => {
    if (category === 'mobile') {
      return unitOptions.mobile[type] || [];
    }
    if (category === 'indirect') {
      return unitOptions.indirect[type] || [];
    }
    return unitOptions[category] || [];
  };

  const fetchFactors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/emission-factors`);
      setFactors(response.data);
    } catch (err) {
      setError(err.response?.data?.message || '获取排放因子失败');
      console.error('Error fetching emission factors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 检查用户权限和登录状态
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // 如果没有token，重定向到登录页
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    
    // 设置当前用户
    setCurrentUser(user);
    
    // 如果不是admin，重定向到dashboard
    if (user.role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // 权限检查通过，获取数据
    fetchFactors();
  }, [navigate, location.pathname, fetchFactors]);

  const handleAddClick = () => {
    setCurrentFactor({
      category: '',
      type: '',
      name: '',
      value: '',
      unit: '',
      description: ''
    });
    setEditingFactor(null);
    setOpenDialog(true);
  };

  const handleEditClick = (factor) => {
    setCurrentFactor({ ...factor });
    setEditingFactor(factor._id);
    setOpenDialog(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('确定要删除此排放因子吗？')) {
      try {
        await axios.delete(`${API_BASE_URL}/emission-factors/${id}`);
        fetchFactors(); // Refresh list
      } catch (err) {
        setError(err.response?.data?.message || '删除排放因子失败');
        console.error('Error deleting emission factor:', err);
      }
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingFactor(null);
    setError(null); // Clear error on close
  };

  const handleSaveFactor = async () => {
    setError(null);
    
    // 前端验证
    if (!currentFactor.category) {
      setError('请选择类别');
      return;
    }
    if (!currentFactor.name || currentFactor.name.trim() === '') {
      setError('请输入名称');
      return;
    }
    if (currentFactor.value === '' || currentFactor.value === null || currentFactor.value === undefined) {
      setError('请输入值');
      return;
    }
    if (!currentFactor.unit) {
      setError('请选择单位');
      return;
    }
    
    try {
      // 准备发送的数据，确保 value 是数字类型
      const factorData = {
        ...currentFactor,
        value: Number(currentFactor.value),
        // 对于非 mobile 类别，如果没有 type，就不发送（后端会使用 category 作为默认值）
        type: currentFactor.category === 'mobile' ? currentFactor.type : (currentFactor.type || currentFactor.category)
      };
      
      if (editingFactor) {
        // Update existing factor
        await axios.put(`${API_BASE_URL}/emission-factors/${editingFactor}`, factorData);
      } else {
        // Create new factor
        await axios.post(`${API_BASE_URL}/emission-factors`, factorData);
      }
      fetchFactors(); // Refresh list
      handleDialogClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || '保存排放因子失败';
      setError(errorMessage);
      console.error('Error saving emission factor:', err);
      console.error('Error details:', err.response?.data);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentFactor(prev => ({ ...prev, [name]: value }));
  };

  const handleInitializeFactors = async () => {
    if (window.confirm('确定要初始化排放因子吗？这将从硬编码文件导入数据，并跳过已存在的因子。')) {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post(`${API_BASE_URL}/emission-factors/initialize`);
        alert(response.data.message);
        fetchFactors();
      } catch (err) {
        setError(err.response?.data?.message || '初始化排放因子失败');
        console.error('Error initializing emission factors:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        排放因子管理
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 1 } 
      }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleAddClick}
          fullWidth
          sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
        >
          添加新因子
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleInitializeFactors}
          fullWidth
          sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
        >
          初始化默认因子
        </Button>
      </Box>

      <TableContainer 
        component={Paper}
        sx={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '& .MuiTable-root': {
            minWidth: 800
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 80 }}>类别</TableCell>
              <TableCell sx={{ minWidth: 80 }}>类型</TableCell>
              <TableCell sx={{ minWidth: 100 }}>名称</TableCell>
              <TableCell sx={{ minWidth: 80 }}>值</TableCell>
              <TableCell sx={{ minWidth: 80 }}>单位</TableCell>
              <TableCell sx={{ minWidth: 120 }}>描述</TableCell>
              <TableCell sx={{ minWidth: 150 }}>最后更新</TableCell>
              <TableCell sx={{ minWidth: 100 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {factors.map((factor) => (
              <TableRow key={factor._id}>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {categories.find(cat => cat.value === factor.category)?.label || factor.category}
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {factor.category === 'mobile'
                    ? mobileTypes.find(type => type.value === factor.type)?.label || factor.type
                    : factor.type}
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{factor.name}</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{factor.value}</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{factor.unit}</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{factor.description}</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{new Date(factor.lastUpdated).toLocaleString()}</TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => handleEditClick(factor)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteClick(factor._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>{editingFactor ? '编辑排放因子' : '添加排放因子'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>类别</InputLabel>
            <Select
              name="category"
              value={currentFactor.category}
              onChange={handleChange}
              label="类别"
            >
              {categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {currentFactor.category === 'mobile' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>移动源类型</InputLabel>
              <Select
                name="type"
                value={currentFactor.type}
                onChange={handleChange}
                label="移动源类型"
              >
                {mobileTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            margin="normal"
            fullWidth
            label="名称"
            name="name"
            value={currentFactor.name}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="值"
            name="value"
            type="number"
            value={currentFactor.value}
            onChange={handleChange}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>单位</InputLabel>
            <Select
              name="unit"
              value={currentFactor.unit}
              onChange={handleChange}
              label="单位"
            >
              {getUnitsForCategoryAndType(currentFactor.category, currentFactor.type).map(unit => (
                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            fullWidth
            label="描述"
            name="description"
            value={currentFactor.description}
            onChange={handleChange}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} startIcon={<CancelIcon />}>取消</Button>
          <Button onClick={handleSaveFactor} startIcon={<SaveIcon />} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmissionFactorManagementPage;
