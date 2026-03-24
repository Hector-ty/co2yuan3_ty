import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Storage as DatabaseIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 编辑化石燃料时，根据“燃料类型(中文)”默认填入“燃料类型(英文)”
const FUEL_TYPE_CN_TO_EN = {
  无烟煤: 'solid',
  烟煤: 'solid',
  褐煤: 'solid',
  燃料油: 'liquid',
  汽油: 'liquid',
  柴油: 'liquid',
  煤油: 'liquid',
  液化石油气: 'liquid',
  液化天然气: 'liquid',
  焦炉煤气: 'gas',
  管道煤气: 'gas'
};

// 绿地碳汇因子：植被类型 name -> 中文显示
const GREEN_SINK_VEGETATION_LABELS = { tree: '乔木', shrub: '灌木', herb: '草本' };
const GREEN_SINK_VEGETATION_OPTIONS = [
  { value: 'tree', label: '乔木' },
  { value: 'shrub', label: '灌木' },
  { value: 'herb', label: '草本' }
];
const GREEN_SINK_UNIT = 'tCO₂e/亩·年';

const NewEmissionFactorManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // 数据状态
  const [fossilFuels, setFossilFuels] = useState([]);
  const [airConditioning, setAirConditioning] = useState([]);
  const [fireSuppression, setFireSuppression] = useState([]);
  const [indirectEmissions, setIndirectEmissions] = useState([]);
  const [greenSinkFactors, setGreenSinkFactors] = useState([]);
  
  // Canvas粒子系统
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('fossil'); // 'fossil', 'fugitive', 'indirect', 'greenSink'
  const [dialogMode, setDialogMode] = useState('add'); // 'add', 'edit'
  const [editingFactor, setEditingFactor] = useState(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    // 化石燃料
    fuelTypeCn: '',
    fuelTypeEn: '',
    emissionFactor: '',
    unit: '',
    gwp: '-',
    // 逸散排放
    gasNameCn: '',
    gasNameEn: '',
    gwpValue: '',
    category: 'airConditioning',
    // 间接排放
    emissionTypeCn: '',
    emissionTypeEn: '',
    remarks: '-',
    // 绿地碳汇
    vegetationType: '',
    greenSinkEmissionFactor: ''
  });

  const fetchFactors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/emission-factors`);
      const allFactors = response.data;
      
      // 分类数据
      // 化石燃料包括：fossil类别，以及solid、liquid、gas类别（这些是实际的化石燃料数据）
      const fossil = allFactors.filter(f => 
        f.category === 'fossil' || 
        f.category === 'solid' || 
        f.category === 'liquid' || 
        f.category === 'gas'
      );
      const fugitive = allFactors.filter(f => f.category === 'fugitive');
      const indirect = allFactors.filter(f => f.category === 'indirect');
      const greenSink = allFactors.filter(f => f.category === 'greenSink');
      
      setFossilFuels(fossil);
      setAirConditioning(fugitive.filter(f => f.fugitiveCategory === 'airConditioning'));
      setFireSuppression(fugitive.filter(f => f.fugitiveCategory === 'fireSuppression'));
      setIndirectEmissions(indirect);
      setGreenSinkFactors(greenSink);
    } catch (err) {
      setError(err.response?.data?.message || '获取排放因子失败');
      console.error('Error fetching emission factors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 使用专门的排放因子管理系统 token
    const emissionFactorToken = localStorage.getItem('emissionFactorToken');
    const emissionFactorUser = localStorage.getItem('emissionFactorUser');
    
    // 认证检查已在路由层面完成，这里只设置用户信息
    if (emissionFactorUser) {
      try {
        const user = JSON.parse(emissionFactorUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }
    
    fetchFactors();
  }, [location.pathname, fetchFactors]);

  const handleAdd = (type) => {
    setDialogType(type);
    setDialogMode('add');
    setEditingFactor(null);
    setFormData({
      fuelTypeCn: '',
      fuelTypeEn: '',
      emissionFactor: '',
      unit: '',
      gwp: '-',
      gasNameCn: '',
      gasNameEn: '',
      gwpValue: '',
      category: 'airConditioning',
      emissionTypeCn: '',
      emissionTypeEn: '',
      remarks: '-',
      vegetationType: '',
      greenSinkEmissionFactor: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (factor, type) => {
    setDialogType(type);
    setDialogMode('edit');
    setEditingFactor(factor);

    if (type === 'greenSink') {
      setFormData({
        fuelTypeCn: '',
        fuelTypeEn: '',
        emissionFactor: '',
        unit: '',
        gwp: '-',
        gasNameCn: '',
        gasNameEn: '',
        gwpValue: '',
        category: 'airConditioning',
        emissionTypeCn: '',
        emissionTypeEn: '',
        remarks: '-',
        vegetationType: factor.name || '',
        greenSinkEmissionFactor: factor.emissionFactor || factor.value?.toString() || ''
      });
      setDialogOpen(true);
      return;
    }

    // 为编辑化石燃料排放因子提供更智能的默认值
    let fuelTypeCn = factor.fuelTypeCn || '';
    let fuelTypeEn = factor.fuelTypeEn || '';

    if (type === 'fossil') {
      // 如果缺少 fuelTypeCn / fuelTypeEn，尝试从 description 中解析，例如："柴油 (Diesel)"
      if ((!fuelTypeCn || !fuelTypeEn) && typeof factor.description === 'string') {
        const match = factor.description.match(/^(.+?)\s*\((.+?)\)\s*$/);
        if (match) {
          if (!fuelTypeCn) fuelTypeCn = match[1];
          if (!fuelTypeEn) fuelTypeEn = match[2];
        }
      }
      // 如果仍然没有，则回退到 name 或 type，保证编辑时有默认填入值
      if (!fuelTypeCn && !fuelTypeEn) {
        const baseName = factor.name || factor.type || '';
        fuelTypeCn = baseName;
        fuelTypeEn = baseName;
      } else {
        if (!fuelTypeCn) fuelTypeCn = factor.name || factor.type || '';
        if (!fuelTypeEn) fuelTypeEn = factor.name || factor.type || '';
      }
      // 若中文名称在预定义映射中，则“燃料类型(英文)”默认显示为对应类别
      const mappedEn = FUEL_TYPE_CN_TO_EN[fuelTypeCn.trim()];
      if (mappedEn !== undefined) {
        fuelTypeEn = mappedEn;
      }
    }

    setFormData({
      fuelTypeCn,
      fuelTypeEn,
      emissionFactor: factor.emissionFactor || factor.value?.toString() || '',
      unit: factor.unit || '',
      gwp: factor.gwp || '-',
      gasNameCn: factor.gasNameCn || '',
      gasNameEn: factor.gasNameEn || '',
      gwpValue: factor.gwpValue?.toString() || '',
      category: factor.fugitiveCategory || 'airConditioning',
      emissionTypeCn: factor.emissionTypeCn || '',
      emissionTypeEn: factor.emissionTypeEn || '',
      remarks: factor.remarks || '-',
      vegetationType: '',
      greenSinkEmissionFactor: ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (factor) => {
    if (!window.confirm('确定要删除此排放因子吗？')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/emission-factors/${factor._id}`);
      setSuccess('删除成功');
      fetchFactors();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  const handleSave = async () => {
    setError(null);
    
    try {
      let factorData = {};
      
      if (dialogType === 'fossil') {
        if (!formData.fuelTypeCn || !formData.fuelTypeEn || !formData.emissionFactor || !formData.unit) {
          setError('请填写所有必填字段');
          return;
        }
        // 后端只接受 category 为 solid / liquid / gas / indirect，化石燃料用 solid|liquid|gas
        const fossilCategory = ['solid', 'liquid', 'gas'].includes(formData.fuelTypeEn)
          ? formData.fuelTypeEn
          : 'solid';
        factorData = {
          category: fossilCategory,
          type: fossilCategory,
          name: formData.fuelTypeEn.toLowerCase().replace(/\s+/g, ''),
          value: parseFloat(formData.emissionFactor) || 0,
          unit: formData.unit,
          description: `${formData.fuelTypeCn} (${formData.fuelTypeEn})`,
          fuelTypeCn: formData.fuelTypeCn,
          fuelTypeEn: formData.fuelTypeEn,
          emissionFactor: formData.emissionFactor,
          gwp: formData.gwp
        };
      } else if (dialogType === 'fugitive') {
        if (!formData.gasNameCn || !formData.gasNameEn || !formData.gwpValue || !formData.emissionFactor || !formData.unit) {
          setError('请填写所有必填字段');
          return;
        }
        factorData = {
          category: 'fugitive',
          type: formData.category,
          name: formData.gasNameEn.toLowerCase().replace(/\s+/g, ''),
          value: parseFloat(formData.emissionFactor.replace('%', '')) || 0,
          unit: formData.unit,
          description: `${formData.gasNameCn} (${formData.gasNameEn})`,
          gasNameCn: formData.gasNameCn,
          gasNameEn: formData.gasNameEn,
          gwpValue: parseInt(formData.gwpValue) || 0,
          emissionFactor: formData.emissionFactor,
          fugitiveCategory: formData.category
        };
      } else if (dialogType === 'indirect') {
        if (!formData.emissionTypeCn || !formData.emissionTypeEn || !formData.emissionFactor || !formData.unit) {
          setError('请填写所有必填字段');
          return;
        }
        factorData = {
          category: 'indirect',
          type: formData.emissionTypeEn.toLowerCase().replace(/\s+/g, ''),
          name: formData.emissionTypeEn.toLowerCase().replace(/\s+/g, ''),
          value: parseFloat(formData.emissionFactor) || 0,
          unit: formData.unit,
          description: `${formData.emissionTypeCn} (${formData.emissionTypeEn})`,
          emissionTypeCn: formData.emissionTypeCn,
          emissionTypeEn: formData.emissionTypeEn,
          emissionFactor: formData.emissionFactor,
          remarks: formData.remarks
        };
      } else if (dialogType === 'greenSink') {
        if (!formData.vegetationType || formData.greenSinkEmissionFactor === '' || formData.greenSinkEmissionFactor === undefined) {
          setError('请选择植被类型并填写排放因子');
          return;
        }
        const veg = formData.vegetationType; // tree | shrub | herb
        factorData = {
          category: 'greenSink',
          type: veg,
          name: veg,
          value: parseFloat(formData.greenSinkEmissionFactor) || 0,
          unit: GREEN_SINK_UNIT,
          description: `绿地碳汇因子-${GREEN_SINK_VEGETATION_LABELS[veg] || veg}`,
          emissionFactor: String(formData.greenSinkEmissionFactor)
        };
      }
      
      if (dialogMode === 'edit' && editingFactor) {
        await axios.put(`${API_BASE_URL}/emission-factors/${editingFactor._id}`, factorData);
        setSuccess('更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/emission-factors`, factorData);
        setSuccess('添加成功');
      }
      
      setDialogOpen(false);
      fetchFactors();
    } catch (err) {
      setError(err.response?.data?.message || '保存失败');
    }
  };

  const handleMigrate = async () => {
    if (!window.confirm('确定要迁移新系统的排放因子数据吗？')) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/emission-factors/migrate`);
      setSuccess(response.data.message || '迁移成功');
      fetchFactors();
    } catch (err) {
      setError(err.response?.data?.message || '迁移失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return null;
  }

  const totalCount = fossilFuels.length + airConditioning.length + fireSuppression.length + indirectEmissions.length + greenSinkFactors.length;

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 50%, rgba(240, 147, 251, 0.15) 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientMove 10s ease infinite',
          '@keyframes gradientMove': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' }
          },
          pointerEvents: 'none',
          zIndex: 0
        },
      }}
    >
      
      {/* 动态光点特效 - 超复杂版 */}
      {[...Array(50)].map((_, i) => {
        // 随机分散分布
        const topPos = (i * 137.5) % 100; // 使用黄金角度分布
        const leftPos = (i * 223.6) % 100;
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: `${Math.max(2, Math.min(98, topPos))}%`,
              left: `${Math.max(2, Math.min(98, leftPos))}%`,
              width: `${5 + (i % 4) * 2}px`,
              height: `${5 + (i % 4) * 2}px`,
              borderRadius: '50%',
              background: i % 3 === 0 
                ? 'radial-gradient(circle, rgba(102, 126, 234, 1) 0%, rgba(102, 126, 234, 0.5) 50%, transparent 80%)'
                : i % 3 === 1
                ? 'radial-gradient(circle, rgba(240, 147, 251, 1) 0%, rgba(240, 147, 251, 0.5) 50%, transparent 80%)'
                : 'radial-gradient(circle, rgba(118, 75, 162, 1) 0%, rgba(118, 75, 162, 0.5) 50%, transparent 80%)',
              boxShadow: i % 3 === 0
                ? '0 0 30px rgba(102, 126, 234, 1), 0 0 60px rgba(102, 126, 234, 0.6), 0 0 90px rgba(102, 126, 234, 0.4)'
                : i % 3 === 1
                ? '0 0 30px rgba(240, 147, 251, 1), 0 0 60px rgba(240, 147, 251, 0.6), 0 0 90px rgba(240, 147, 251, 0.4)'
                : '0 0 30px rgba(118, 75, 162, 1), 0 0 60px rgba(118, 75, 162, 0.6), 0 0 90px rgba(118, 75, 162, 0.4)',
              animation: `twinkleFast${i % 4} ${1.5 + (i % 3) * 0.8}s ease-in-out infinite, floatFast${i % 3} ${5 + i * 0.3}s ease-in-out infinite, rotate${i % 2} ${10 + i * 0.5}s linear infinite`,
              opacity: 0.6,
              '@keyframes twinkleFast0': {
                '0%, 100%': { opacity: 0.4, transform: 'scale(0.7) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.4) rotate(180deg)' }
              },
              '@keyframes twinkleFast1': {
                '0%, 100%': { opacity: 0.5, transform: 'scale(0.8) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.5) rotate(-180deg)' }
              },
              '@keyframes twinkleFast2': {
                '0%, 100%': { opacity: 0.45, transform: 'scale(0.75) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.3) rotate(90deg)' }
              },
              '@keyframes twinkleFast3': {
                '0%, 100%': { opacity: 0.5, transform: 'scale(0.85) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.6) rotate(-90deg)' }
              },
              '@keyframes floatFast0': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '25%': { transform: 'translate(30px, -25px)' },
                '50%': { transform: 'translate(-20px, 30px)' },
                '75%': { transform: 'translate(25px, 15px)' }
              },
              '@keyframes floatFast1': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '33%': { transform: 'translate(-25px, 25px)' },
                '66%': { transform: 'translate(20px, -30px)' }
              },
              '@keyframes floatFast2': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '20%': { transform: 'translate(35px, 20px)' },
                '40%': { transform: 'translate(-30px, -25px)' },
                '60%': { transform: 'translate(15px, 35px)' },
                '80%': { transform: 'translate(-20px, -15px)' }
              },
              '@keyframes rotate0': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              },
              '@keyframes rotate1': {
                '0%': { transform: 'rotate(360deg)' },
                '100%': { transform: 'rotate(0deg)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 大型脉冲光点 - 超复杂版 */}
      {[...Array(10)].map((_, i) => (
        <Box
          key={`large-${i}`}
          sx={{
            position: 'absolute',
            top: `${[15, 65, 8, 72, 35, 88, 25, 55, 12, 78][i]}%`,
            left: `${[20, 75, 5, 80, 30, 88, 18, 68, 10, 82][i]}%`,
            width: `${100 + i * 30}px`,
            height: `${100 + i * 30}px`,
            borderRadius: '50%',
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(102, 126, 234, 0.35) 0%, rgba(102, 126, 234, 0.2) 40%, transparent 70%)'
              : 'radial-gradient(circle, rgba(240, 147, 251, 0.35) 0%, rgba(240, 147, 251, 0.2) 40%, transparent 70%)',
            filter: 'blur(30px)',
            animation: `pulseLargeFast${i} ${2.5 + i * 0.5}s ease-in-out infinite, moveLarge${i} ${12 + i * 2}s ease-in-out infinite`,
            opacity: 0.5,
            '@keyframes pulseLargeFast0': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.9)' },
              '50%': { opacity: 0.9, transform: 'scale(1.4)' }
            },
            '@keyframes pulseLargeFast1': {
              '0%, 100%': { opacity: 0.45, transform: 'scale(0.85)' },
              '50%': { opacity: 0.95, transform: 'scale(1.5)' }
            },
            '@keyframes pulseLargeFast2': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.95)' },
              '50%': { opacity: 0.85, transform: 'scale(1.35)' }
            },
            '@keyframes pulseLargeFast3': {
              '0%, 100%': { opacity: 0.5, transform: 'scale(0.9)' },
              '50%': { opacity: 1, transform: 'scale(1.45)' }
            },
            '@keyframes moveLarge0': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '25%': { transform: 'translate(40px, -30px)' },
              '50%': { transform: 'translate(-30px, 40px)' },
              '75%': { transform: 'translate(30px, 30px)' }
            },
            '@keyframes moveLarge1': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '33%': { transform: 'translate(-40px, 30px)' },
              '66%': { transform: 'translate(35px, -40px)' }
            },
            '@keyframes moveLarge2': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '20%': { transform: 'translate(50px, 25px)' },
              '40%': { transform: 'translate(-35px, -30px)' },
              '60%': { transform: 'translate(25px, 45px)' },
              '80%': { transform: 'translate(-30px, -20px)' }
            },
            '@keyframes moveLarge3': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '25%': { transform: 'translate(-35px, 35px)' },
              '50%': { transform: 'translate(40px, -25px)' },
              '75%': { transform: 'translate(-25px, -35px)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      ))}
      
      {/* 快速闪烁的小光点 */}
      {[...Array(25)].map((_, i) => {
        const topPos = (i * 144.7) % 100;
        const leftPos = (i * 233.1) % 100;
        return (
          <Box
            key={`quick-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(3, Math.min(97, topPos))}%`,
              left: `${Math.max(3, Math.min(97, leftPos))}%`,
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(102, 126, 234, 1) 0%, transparent 80%)'
                : 'radial-gradient(circle, rgba(240, 147, 251, 1) 0%, transparent 80%)',
              boxShadow: i % 2 === 0
                ? '0 0 15px rgba(102, 126, 234, 1), 0 0 30px rgba(102, 126, 234, 0.7), 0 0 45px rgba(102, 126, 234, 0.4)'
                : '0 0 15px rgba(240, 147, 251, 1), 0 0 30px rgba(240, 147, 251, 0.7), 0 0 45px rgba(240, 147, 251, 0.4)',
              animation: `quickFlash${i % 2} ${0.8 + i * 0.1}s ease-in-out infinite`,
              opacity: 0.5,
              '@keyframes quickFlash0': {
                '0%, 100%': { opacity: 0.3, transform: 'scale(0.5)' },
                '50%': { opacity: 1, transform: 'scale(1.5)' }
              },
              '@keyframes quickFlash1': {
                '0%, 100%': { opacity: 0.4, transform: 'scale(0.6)' },
                '50%': { opacity: 1, transform: 'scale(1.8)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 中型脉冲光点 */}
      {[...Array(18)].map((_, i) => {
        const topPos = (i * 152.3) % 100;
        const leftPos = (i * 241.7) % 100;
        return (
          <Box
            key={`medium-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(5, Math.min(95, topPos))}%`,
              left: `${Math.max(5, Math.min(95, leftPos))}%`,
              width: `${40 + (i % 3) * 20}px`,
              height: `${40 + (i % 3) * 20}px`,
              borderRadius: '50%',
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, rgba(102, 126, 234, 0.2) 50%, transparent 80%)'
                : 'radial-gradient(circle, rgba(240, 147, 251, 0.4) 0%, rgba(240, 147, 251, 0.2) 50%, transparent 80%)',
              filter: 'blur(15px)',
              animation: `pulseMedium${i % 3} ${2 + i * 0.3}s ease-in-out infinite, drift${i % 2} ${8 + i * 0.5}s ease-in-out infinite`,
              opacity: 0.4,
              '@keyframes pulseMedium0': {
                '0%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
                '50%': { opacity: 0.7, transform: 'scale(1.3)' }
              },
              '@keyframes pulseMedium1': {
                '0%, 100%': { opacity: 0.35, transform: 'scale(0.85)' },
                '50%': { opacity: 0.75, transform: 'scale(1.4)' }
              },
              '@keyframes pulseMedium2': {
                '0%, 100%': { opacity: 0.32, transform: 'scale(0.9)' },
                '50%': { opacity: 0.68, transform: 'scale(1.25)' }
              },
              '@keyframes drift0': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '25%': { transform: 'translate(25px, -20px)' },
                '50%': { transform: 'translate(-20px, 25px)' },
                '75%': { transform: 'translate(20px, 20px)' }
              },
              '@keyframes drift1': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '33%': { transform: 'translate(-25px, 20px)' },
                '66%': { transform: 'translate(20px, -25px)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 流动光带效果 */}
      {[...Array(6)].map((_, i) => {
        const topPos = [18, 45, 72, 25, 58, 85][i];
        return (
          <Box
          key={`flow-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: '-100%',
            width: '300px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${
              i === 0 ? 'rgba(102, 126, 234, 0.9)' : i === 1 ? 'rgba(240, 147, 251, 0.9)' : 'rgba(118, 75, 162, 0.9)'
            }, transparent)`,
            boxShadow: i === 0
              ? '0 0 20px rgba(102, 126, 234, 1), 0 0 40px rgba(102, 126, 234, 0.6), 0 0 60px rgba(102, 126, 234, 0.3)'
              : i === 1
              ? '0 0 20px rgba(240, 147, 251, 1), 0 0 40px rgba(240, 147, 251, 0.6), 0 0 60px rgba(240, 147, 251, 0.3)'
              : '0 0 20px rgba(118, 75, 162, 1), 0 0 40px rgba(118, 75, 162, 0.6), 0 0 60px rgba(118, 75, 162, 0.3)',
            animation: `flow${i} ${12 + i * 2}s linear infinite`,
            opacity: 0.8,
            '@keyframes flow0': {
              '0%': { left: '-100%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '100%', opacity: 0 }
            },
            '@keyframes flow1': {
              '0%': { left: '-100%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '100%', opacity: 0 }
            },
            '@keyframes flow2': {
              '0%': { left: '-100%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '100%', opacity: 0 }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 旋转光环 */}
      {[...Array(8)].map((_, i) => {
        const topPos = [12, 58, 28, 75, 42, 88, 18, 65][i];
        const leftPos = [22, 68, 12, 78, 35, 85, 8, 72][i];
        return (
          <Box
          key={`ring-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: `${leftPos}%`,
            width: `${150 + i * 50}px`,
            height: `${150 + i * 50}px`,
            borderRadius: '50%',
            border: `2px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.4)' : 'rgba(240, 147, 251, 0.4)'}`,
            borderTopColor: i % 2 === 0 ? 'rgba(102, 126, 234, 1)' : 'rgba(240, 147, 251, 1)',
            borderRightColor: i % 2 === 0 ? 'rgba(102, 126, 234, 0.8)' : 'rgba(240, 147, 251, 0.8)',
            animation: `rotateRing${i % 2} ${8 + i * 2}s linear infinite`,
            opacity: 0.4,
            '@keyframes rotateRing0': {
              '0%': { transform: 'rotate(0deg) scale(1)' },
              '50%': { transform: 'rotate(180deg) scale(1.1)' },
              '100%': { transform: 'rotate(360deg) scale(1)' }
            },
            '@keyframes rotateRing1': {
              '0%': { transform: 'rotate(360deg) scale(1)' },
              '50%': { transform: 'rotate(180deg) scale(0.9)' },
              '100%': { transform: 'rotate(0deg) scale(1)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(1px)'
          }}
        />
        );
      })}
      
      {/* 多层背景光晕 */}
      {[...Array(5)].map((_, i) => {
        const topPos = [50, 28, 72, 18, 82][i];
        const leftPos = [50, 18, 78, 8, 88][i];
        return (
          <Box
          key={`glow-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: `${leftPos}%`,
            width: `${600 + i * 100}px`,
            height: `${600 + i * 100}px`,
            transform: 'translate(-50%, -50%)',
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, rgba(102, 126, 234, 0.1) 30%, transparent 70%)'
              : 'radial-gradient(circle, rgba(240, 147, 251, 0.2) 0%, rgba(240, 147, 251, 0.1) 30%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: `breathe${i} ${5 + i * 0.8}s ease-in-out infinite`,
            opacity: 0.6,
            '@keyframes breathe0': {
              '0%, 100%': { opacity: 0.6, transform: 'translate(-50%, -50%) scale(1)' },
              '50%': { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1.3)' }
            },
            '@keyframes breathe1': {
              '0%, 100%': { opacity: 0.5, transform: 'translate(-50%, -50%) scale(0.9)' },
              '50%': { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1.4)' }
            },
            '@keyframes breathe2': {
              '0%, 100%': { opacity: 0.55, transform: 'translate(-50%, -50%) scale(1.1)' },
              '50%': { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1.2)' }
            },
            '@keyframes breathe3': {
              '0%, 100%': { opacity: 0.6, transform: 'translate(-50%, -50%) scale(0.95)' },
              '50%': { opacity: 0.95, transform: 'translate(-50%, -50%) scale(1.35)' }
            },
            '@keyframes breathe4': {
              '0%, 100%': { opacity: 0.5, transform: 'translate(-50%, -50%) scale(1.05)' },
              '50%': { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1.25)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 星形光点 */}
      {[...Array(12)].map((_, i) => {
        const topPos = (i * 159.4) % 100;
        const leftPos = (i * 251.2) % 100;
        return (
          <Box
          key={`star-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(5, Math.min(95, topPos))}%`,
            left: `${Math.max(5, Math.min(95, leftPos))}%`,
            width: `${6 + (i % 3) * 3}px`,
            height: `${6 + (i % 3) * 3}px`,
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(102, 126, 234, 0.6) 50%, transparent 80%)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(240, 147, 251, 0.6) 50%, transparent 80%)',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            animation: `starTwinkle${i % 3} ${1.2 + i * 0.15}s ease-in-out infinite, starRotate${i % 2} ${4 + i * 0.5}s linear infinite`,
            opacity: 0.5,
            '@keyframes starTwinkle0': {
              '0%, 100%': { opacity: 0.3, transform: 'scale(0.6)' },
              '50%': { opacity: 1, transform: 'scale(1.2)' }
            },
            '@keyframes starTwinkle1': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.7)' },
              '50%': { opacity: 1, transform: 'scale(1.3)' }
            },
            '@keyframes starTwinkle2': {
              '0%, 100%': { opacity: 0.35, transform: 'scale(0.65)' },
              '50%': { opacity: 0.95, transform: 'scale(1.25)' }
            },
            '@keyframes starRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes starRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
          }}
        />
        );
      })}
      
      {/* 粒子轨迹线 */}
      {[...Array(15)].map((_, i) => {
        const topPos = (i * 166.5) % 100;
        const leftPos = (i * 262.8) % 100;
        return (
          <Box
          key={`trail-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(3, Math.min(97, topPos))}%`,
            left: `${Math.max(3, Math.min(97, leftPos))}%`,
            width: '2px',
            height: `${30 + (i % 4) * 15}px`,
            background: `linear-gradient(180deg, ${
              i % 3 === 0 
                ? 'rgba(102, 126, 234, 0.8) 0%, rgba(102, 126, 234, 0.4) 50%, transparent 100%'
                : i % 3 === 1
                ? 'rgba(240, 147, 251, 0.8) 0%, rgba(240, 147, 251, 0.4) 50%, transparent 100%'
                : 'rgba(118, 75, 162, 0.8) 0%, rgba(118, 75, 162, 0.4) 50%, transparent 100%'
            })`,
            boxShadow: i % 3 === 0
              ? '0 0 8px rgba(102, 126, 234, 0.6)'
              : i % 3 === 1
              ? '0 0 8px rgba(240, 147, 251, 0.6)'
              : '0 0 8px rgba(118, 75, 162, 0.6)',
            animation: `trailMove${i % 3} ${3 + i * 0.2}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes trailMove0': {
              '0%, 100%': { opacity: 0.2, transform: 'translateY(0) rotate(0deg)' },
              '50%': { opacity: 0.8, transform: 'translateY(-20px) rotate(180deg)' }
            },
            '@keyframes trailMove1': {
              '0%, 100%': { opacity: 0.3, transform: 'translateY(0) rotate(0deg)' },
              '50%': { opacity: 0.9, transform: 'translateY(20px) rotate(-180deg)' }
            },
            '@keyframes trailMove2': {
              '0%, 100%': { opacity: 0.25, transform: 'translateY(0) rotate(0deg)' },
              '50%': { opacity: 0.85, transform: 'translateY(-15px) rotate(90deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 六边形网格 */}
      {[...Array(20)].map((_, i) => {
        const topPos = (i * 173.6) % 100;
        const leftPos = (i * 274.4) % 100;
        return (
          <Box
            key={`hex-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(5, Math.min(95, topPos))}%`,
              left: `${Math.max(5, Math.min(95, leftPos))}%`,
              width: '40px',
              height: '40px',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              border: `1px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.15)' : 'rgba(240, 147, 251, 0.15)'}`,
              animation: `hexPulse${i % 2} ${4 + i * 0.3}s ease-in-out infinite`,
              opacity: 0.15,
              '@keyframes hexPulse0': {
                '0%, 100%': { opacity: 0.1, transform: 'scale(0.8) rotate(0deg)' },
                '50%': { opacity: 0.3, transform: 'scale(1.1) rotate(60deg)' }
              },
              '@keyframes hexPulse1': {
                '0%, 100%': { opacity: 0.15, transform: 'scale(0.9) rotate(0deg)' },
                '50%': { opacity: 0.35, transform: 'scale(1.15) rotate(-60deg)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 波浪光效 */}
      {[...Array(5)].map((_, i) => (
        <Box
          key={`wave-${i}`}
          sx={{
            position: 'absolute',
            top: `${15 + i * 18}%`,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${
              i % 2 === 0 
                ? 'rgba(102, 126, 234, 0.4)' 
                : 'rgba(240, 147, 251, 0.4)'
            }, transparent)`,
            boxShadow: i % 2 === 0
              ? '0 0 15px rgba(102, 126, 234, 0.5)'
              : '0 0 15px rgba(240, 147, 251, 0.5)',
            animation: `wave${i} ${6 + i * 0.5}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes wave0': {
              '0%, 100%': { opacity: 0.2, transform: 'scaleX(0.5)' },
              '50%': { opacity: 0.6, transform: 'scaleX(1.2)' }
            },
            '@keyframes wave1': {
              '0%, 100%': { opacity: 0.25, transform: 'scaleX(0.6)' },
              '50%': { opacity: 0.65, transform: 'scaleX(1.3)' }
            },
            '@keyframes wave2': {
              '0%, 100%': { opacity: 0.2, transform: 'scaleX(0.55)' },
              '50%': { opacity: 0.6, transform: 'scaleX(1.25)' }
            },
            '@keyframes wave3': {
              '0%, 100%': { opacity: 0.3, transform: 'scaleX(0.5)' },
              '50%': { opacity: 0.7, transform: 'scaleX(1.3)' }
            },
            '@keyframes wave4': {
              '0%, 100%': { opacity: 0.25, transform: 'scaleX(0.6)' },
              '50%': { opacity: 0.65, transform: 'scaleX(1.2)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      ))}
      
      {/* 三角形装饰 */}
      {[...Array(15)].map((_, i) => {
        const topPos = (i * 180.7) % 100;
        const leftPos = (i * 286) % 100;
        return (
          <Box
          key={`triangle-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(3, Math.min(97, topPos))}%`,
            left: `${Math.max(3, Math.min(97, leftPos))}%`,
            width: 0,
            height: 0,
            borderLeft: `${20 + (i % 3) * 10}px solid transparent`,
            borderRight: `${20 + (i % 3) * 10}px solid transparent`,
            borderBottom: `${35 + (i % 3) * 15}px solid ${
              i % 3 === 0 
                ? 'rgba(102, 126, 234, 0.3)' 
                : i % 3 === 1
                ? 'rgba(240, 147, 251, 0.3)'
                : 'rgba(118, 75, 162, 0.3)'
            }`,
            filter: 'blur(2px)',
            animation: `triangleFloat${i % 3} ${4 + i * 0.3}s ease-in-out infinite, triangleRotate${i % 2} ${8 + i * 0.5}s linear infinite`,
            opacity: 0.3,
            '@keyframes triangleFloat0': {
              '0%, 100%': { opacity: 0.2, transform: 'translateY(0)' },
              '50%': { opacity: 0.5, transform: 'translateY(-15px)' }
            },
            '@keyframes triangleFloat1': {
              '0%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
              '50%': { opacity: 0.55, transform: 'translateY(15px)' }
            },
            '@keyframes triangleFloat2': {
              '0%, 100%': { opacity: 0.22, transform: 'translateY(0)' },
              '50%': { opacity: 0.52, transform: 'translateY(-10px)' }
            },
            '@keyframes triangleRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes triangleRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 菱形装饰 */}
      {[...Array(12)].map((_, i) => {
        const topPos = (i * 187.8) % 100;
        const leftPos = (i * 297.6) % 100;
        return (
          <Box
          key={`diamond-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(4, Math.min(96, topPos))}%`,
            left: `${Math.max(4, Math.min(96, leftPos))}%`,
            width: `${30 + (i % 3) * 15}px`,
            height: `${30 + (i % 3) * 15}px`,
            background: i % 2 === 0
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(102, 126, 234, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(240, 147, 251, 0.25) 0%, rgba(240, 147, 251, 0.1) 100%)',
            border: `1px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.4)' : 'rgba(240, 147, 251, 0.4)'}`,
            transform: 'rotate(45deg)',
            animation: `diamondPulse${i % 2} ${3 + i * 0.25}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes diamondPulse0': {
              '0%, 100%': { opacity: 0.2, transform: 'rotate(45deg) scale(0.8)' },
              '50%': { opacity: 0.5, transform: 'rotate(45deg) scale(1.2)' }
            },
            '@keyframes diamondPulse1': {
              '0%, 100%': { opacity: 0.25, transform: 'rotate(45deg) scale(0.85)' },
              '50%': { opacity: 0.55, transform: 'rotate(45deg) scale(1.25)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(1px)'
          }}
        />
        );
      })}
      
      {/* 圆形渐变环 */}
      {[...Array(10)].map((_, i) => {
        const topPos = (i * 194.9) % 100;
        const leftPos = (i * 309.2) % 100;
        return (
          <Box
          key={`circle-ring-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(5, Math.min(95, topPos))}%`,
            left: `${Math.max(5, Math.min(95, leftPos))}%`,
            width: `${60 + (i % 4) * 20}px`,
            height: `${60 + (i % 4) * 20}px`,
            borderRadius: '50%',
            border: `3px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.3)' : 'rgba(240, 147, 251, 0.3)'}`,
            borderTopColor: i % 2 === 0 ? 'rgba(102, 126, 234, 0.9)' : 'rgba(240, 147, 251, 0.9)',
            borderRightColor: i % 2 === 0 ? 'rgba(102, 126, 234, 0.6)' : 'rgba(240, 147, 251, 0.6)',
            background: 'transparent',
            animation: `circleRingRotate${i % 2} ${6 + i * 0.4}s linear infinite, circleRingPulse${i % 2} ${4 + i * 0.3}s ease-in-out infinite`,
            opacity: 0.4,
            '@keyframes circleRingRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes circleRingRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            '@keyframes circleRingPulse0': {
              '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
              '50%': { opacity: 0.7, transform: 'scale(1.15)' }
            },
            '@keyframes circleRingPulse1': {
              '0%, 100%': { opacity: 0.35, transform: 'scale(1)' },
              '50%': { opacity: 0.75, transform: 'scale(1.2)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 多边形装饰 */}
      {[...Array(8)].map((_, i) => {
        const topPos = (i * 202) % 100;
        const leftPos = (i * 320.8) % 100;
        const sides = 5 + (i % 3);
        const angle = 360 / sides;
        const points = Array.from({ length: sides }, (_, j) => {
          const a = (angle * j - 90) * (Math.PI / 180);
          const x = 50 + 40 * Math.cos(a);
          const y = 50 + 40 * Math.sin(a);
          return `${x}% ${y}%`;
        }).join(', ');
        
        return (
          <Box
            key={`polygon-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(6, Math.min(94, topPos))}%`,
              left: `${Math.max(6, Math.min(94, leftPos))}%`,
              width: `${50 + (i % 3) * 20}px`,
              height: `${50 + (i % 3) * 20}px`,
              clipPath: `polygon(${points})`,
              background: i % 2 === 0
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(102, 126, 234, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(240, 147, 251, 0.05) 100%)',
              border: `1px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.3)' : 'rgba(240, 147, 251, 0.3)'}`,
              animation: `polygonRotate${i % 2} ${10 + i * 0.5}s linear infinite, polygonPulse${i % 2} ${5 + i * 0.3}s ease-in-out infinite`,
              opacity: 0.2,
              '@keyframes polygonRotate0': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              },
              '@keyframes polygonRotate1': {
                '0%': { transform: 'rotate(360deg)' },
                '100%': { transform: 'rotate(0deg)' }
              },
              '@keyframes polygonPulse0': {
                '0%, 100%': { opacity: 0.15, transform: 'scale(0.9)' },
                '50%': { opacity: 0.4, transform: 'scale(1.1)' }
              },
              '@keyframes polygonPulse1': {
                '0%, 100%': { opacity: 0.2, transform: 'scale(0.95)' },
                '50%': { opacity: 0.45, transform: 'scale(1.15)' }
              },
              zIndex: 0,
              pointerEvents: 'none',
              filter: 'blur(1px)'
            }}
          />
        );
      })}
      
      {/* 静态网格线 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(102, 126, 234, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(102, 126, 234, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          opacity: 0.3,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* 对角线装饰 */}
      {[...Array(12)].map((_, i) => {
        const topPos = [5, 15, 25, 35, 45, 55, 65, 75, 85, 12, 28, 68][i];
        const isLeft = i % 2 === 0;
        return (
          <Box
          key={`diagonal-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: isLeft ? '0%' : 'auto',
            right: !isLeft ? '0%' : 'auto',
            width: '200px',
            height: '1px',
            background: `linear-gradient(${i % 2 === 0 ? '135deg' : '45deg'}, transparent, ${
              i % 3 === 0 
                ? 'rgba(102, 126, 234, 0.3)' 
                : i % 3 === 1
                ? 'rgba(240, 147, 251, 0.3)'
                : 'rgba(118, 75, 162, 0.3)'
            }, transparent)`,
            transform: `rotate(${i % 2 === 0 ? '45deg' : '-45deg'})`,
            transformOrigin: i % 2 === 0 ? 'top left' : 'top right',
            animation: `diagonalFade${i % 3} ${4 + i * 0.3}s ease-in-out infinite`,
            opacity: 0.2,
            '@keyframes diagonalFade0': {
              '0%, 100%': { opacity: 0.1 },
              '50%': { opacity: 0.4 }
            },
            '@keyframes diagonalFade1': {
              '0%, 100%': { opacity: 0.15 },
              '50%': { opacity: 0.45 }
            },
            '@keyframes diagonalFade2': {
              '0%, 100%': { opacity: 0.12 },
              '50%': { opacity: 0.42 }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 矩形框装饰 */}
      {[...Array(10)].map((_, i) => {
        const topPos = (i * 209.1) % 100;
        const leftPos = (i * 331.9) % 100;
        return (
          <Box
          key={`rect-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(4, Math.min(96, topPos))}%`,
            left: `${Math.max(4, Math.min(96, leftPos))}%`,
            width: `${80 + (i % 3) * 40}px`,
            height: `${50 + (i % 3) * 30}px`,
            border: `2px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.25)' : 'rgba(240, 147, 251, 0.25)'}`,
            borderRadius: '4px',
            background: 'transparent',
            boxShadow: i % 2 === 0
              ? 'inset 0 0 20px rgba(102, 126, 234, 0.1)'
              : 'inset 0 0 20px rgba(240, 147, 251, 0.1)',
            animation: `rectPulse${i % 2} ${5 + i * 0.3}s ease-in-out infinite, rectRotate${i % 2} ${12 + i * 0.5}s linear infinite`,
            opacity: 0.2,
            '@keyframes rectPulse0': {
              '0%, 100%': { opacity: 0.15, transform: 'scale(0.95)' },
              '50%': { opacity: 0.4, transform: 'scale(1.05)' }
            },
            '@keyframes rectPulse1': {
              '0%, 100%': { opacity: 0.2, transform: 'scale(0.9)' },
              '50%': { opacity: 0.45, transform: 'scale(1.1)' }
            },
            '@keyframes rectRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes rectRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(0.5px)'
          }}
        />
        );
      })}
      
      {/* 椭圆装饰 */}
      {[...Array(8)].map((_, i) => {
        const topPos = (i * 216.2) % 100;
        const leftPos = (i * 343) % 100;
        return (
          <Box
          key={`ellipse-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(5, Math.min(95, topPos))}%`,
            left: `${Math.max(5, Math.min(95, leftPos))}%`,
            width: `${100 + (i % 3) * 50}px`,
            height: `${60 + (i % 3) * 30}px`,
            borderRadius: '50%',
            border: `2px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.2)' : 'rgba(240, 147, 251, 0.2)'}`,
            background: 'transparent',
            animation: `ellipsePulse${i % 2} ${4 + i * 0.3}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes ellipsePulse0': {
              '0%, 100%': { opacity: 0.2, transform: 'scaleX(0.9) scaleY(0.9)' },
              '50%': { opacity: 0.5, transform: 'scaleX(1.1) scaleY(1.1)' }
            },
            '@keyframes ellipsePulse1': {
              '0%, 100%': { opacity: 0.25, transform: 'scaleX(0.95) scaleY(0.95)' },
              '50%': { opacity: 0.55, transform: 'scaleX(1.15) scaleY(1.15)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(1px)'
          }}
        />
        );
      })}
      
      {/* Header */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
              排放因子管理系统
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Emission Factor Management System
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<DatabaseIcon />}
              onClick={handleMigrate}
              disabled={loading}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              迁移新系统数据
            </Button>
            {currentUser?.role === 'superadmin' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleAdd('fossil')}
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
              >
                新增因子
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={() => {
                // 清除排放因子管理系统的登录信息
                localStorage.removeItem('emissionFactorToken');
                localStorage.removeItem('emissionFactorUser');
                // 触发自定义事件，通知路由组件重新检查认证状态
                window.dispatchEvent(new Event('emissionFactorAuthChange'));
                // 使用 window.location 强制刷新，确保立即退出
                setTimeout(() => {
                  window.location.href = '/EmissionFactorManagement';
                }, 100);
              }}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.1)', 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.5)'
                }
              }}
            >
              退出登录
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
      {success && (
        <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}>
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, position: 'relative', zIndex: 1 }}>
          <CircularProgress />
        </Box>
      ) : totalCount === 0 ? (
        <Card sx={{ position: 'relative', zIndex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <DatabaseIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              暂无排放因子数据
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              点击上方【迁移新系统数据】按钮加载默认排放因子
            </Typography>
            <Button variant="contained" startIcon={<DatabaseIcon />} onClick={handleMigrate}>
              初始化数据
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 1 }}>
          {/* 化石燃料排放因子 */}
          <Accordion defaultExpanded sx={{ bgcolor: 'rgba(33, 150, 243, 0.05)', position: 'relative', zIndex: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  化石燃料排放因子
                </Typography>
                <Chip label={`${fossilFuels.length}种`} size="small" color="primary" />
                {currentUser?.role === 'superadmin' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd('fossil');
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    添加
                  </Button>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>燃料类型</TableCell>
                      <TableCell>英文名</TableCell>
                      <TableCell>排放因子</TableCell>
                      <TableCell>单位</TableCell>
                      <TableCell>GWP</TableCell>
                      {currentUser?.role === 'superadmin' && <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>操作</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fossilFuels.map((factor) => (
                      <TableRow key={factor._id}>
                        <TableCell>{factor.fuelTypeCn || factor.name}</TableCell>
                        <TableCell>{factor.fuelTypeEn || factor.type || factor.name}</TableCell>
                        <TableCell>{factor.emissionFactor || factor.value}</TableCell>
                        <TableCell>{factor.unit}</TableCell>
                        <TableCell>{factor.gwp || '-'}</TableCell>
                        {currentUser?.role === 'superadmin' && (
                          <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>
                            <IconButton size="small" color="primary" onClick={() => handleEdit(factor, 'fossil')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(factor)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* 逸散排放因子 */}
          <Accordion defaultExpanded sx={{ bgcolor: 'rgba(255, 152, 0, 0.05)', position: 'relative', zIndex: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  逸散排放因子
                </Typography>
                <Chip label={`${airConditioning.length + fireSuppression.length}种`} size="small" color="warning" />
                {currentUser?.role === 'superadmin' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd('fugitive');
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    添加
                  </Button>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 空调系统 */}
                {airConditioning.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1, color: 'warning.main', fontWeight: 600 }}>
                      空调系统 / Air Conditioning System ({airConditioning.length}种)
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table sx={{ minWidth: '100%' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>气体名称</TableCell>
                            <TableCell>英文名</TableCell>
                            <TableCell>GWP值</TableCell>
                            <TableCell>排放因子</TableCell>
                            <TableCell>单位</TableCell>
                            {currentUser?.role === 'superadmin' && <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>操作</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {airConditioning.map((factor) => (
                            <TableRow key={factor._id}>
                              <TableCell>{factor.gasNameCn || factor.name}</TableCell>
                              <TableCell>{factor.gasNameEn || factor.name}</TableCell>
                              <TableCell>{factor.gwpValue || '-'}</TableCell>
                              <TableCell>{factor.emissionFactor || factor.value}</TableCell>
                              <TableCell>{factor.unit}</TableCell>
                              {currentUser?.role === 'superadmin' && (
                                <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>
                                  <IconButton size="small" color="primary" onClick={() => handleEdit(factor, 'fugitive')}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDelete(factor)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
                
                {/* 灭火系统 */}
                {fireSuppression.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1, color: 'warning.main', fontWeight: 600 }}>
                      灭火系统 / Fire Suppression System ({fireSuppression.length}种)
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table sx={{ minWidth: '100%' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>气体名称</TableCell>
                            <TableCell>英文名</TableCell>
                            <TableCell>GWP值</TableCell>
                            <TableCell>排放因子</TableCell>
                            <TableCell>单位</TableCell>
                            {currentUser?.role === 'superadmin' && <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>操作</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fireSuppression.map((factor) => (
                            <TableRow key={factor._id}>
                              <TableCell>{factor.gasNameCn || factor.name}</TableCell>
                              <TableCell>{factor.gasNameEn || factor.name}</TableCell>
                              <TableCell>{factor.gwpValue || '-'}</TableCell>
                              <TableCell>{factor.emissionFactor || factor.value}</TableCell>
                              <TableCell>{factor.unit}</TableCell>
                              {currentUser?.role === 'superadmin' && (
                                <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>
                                  <IconButton size="small" color="primary" onClick={() => handleEdit(factor, 'fugitive')}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDelete(factor)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 间接排放因子 */}
          <Accordion defaultExpanded sx={{ bgcolor: 'rgba(76, 175, 80, 0.05)', position: 'relative', zIndex: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  间接排放因子
                </Typography>
                <Chip label={`${indirectEmissions.length}种`} size="small" color="success" />
                {currentUser?.role === 'superadmin' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd('indirect');
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    添加
                  </Button>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>排放类型</TableCell>
                      <TableCell>英文名</TableCell>
                      <TableCell>排放因子</TableCell>
                      <TableCell>单位</TableCell>
                      <TableCell>备注</TableCell>
                      {currentUser?.role === 'superadmin' && <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>操作</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {indirectEmissions.map((factor) => (
                      <TableRow key={factor._id}>
                        <TableCell>{factor.emissionTypeCn || factor.name}</TableCell>
                        <TableCell>{factor.emissionTypeEn || factor.name}</TableCell>
                        <TableCell>{factor.emissionFactor || factor.value}</TableCell>
                        <TableCell>{factor.unit}</TableCell>
                        <TableCell>{factor.remarks || '-'}</TableCell>
                        {currentUser?.role === 'superadmin' && (
                          <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>
                            <IconButton size="small" color="primary" onClick={() => handleEdit(factor, 'indirect')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(factor)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* 绿地碳汇因子 */}
          <Accordion defaultExpanded sx={{ bgcolor: 'rgba(0, 150, 136, 0.08)', position: 'relative', zIndex: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#00695c' }}>
                  绿地碳汇因子
                </Typography>
                <Chip label={`${greenSinkFactors.length}种`} size="small" sx={{ bgcolor: '#00695c', color: '#fff' }} />
                {currentUser?.role === 'superadmin' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd('greenSink');
                    }}
                    sx={{ ml: 'auto', color: '#00695c', borderColor: '#00695c', '&:hover': { borderColor: '#004d40', bgcolor: 'rgba(0, 150, 136, 0.08)' } }}
                    variant="outlined"
                  >
                    添加
                  </Button>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>植被类型</TableCell>
                      <TableCell>排放因子</TableCell>
                      <TableCell>单位</TableCell>
                      {currentUser?.role === 'superadmin' && <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>操作</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {greenSinkFactors.map((factor) => (
                      <TableRow key={factor._id}>
                        <TableCell>{GREEN_SINK_VEGETATION_LABELS[factor.name] || factor.name}</TableCell>
                        <TableCell>{factor.emissionFactor ?? factor.value}</TableCell>
                        <TableCell>{factor.unit || GREEN_SINK_UNIT}</TableCell>
                        {currentUser?.role === 'superadmin' && (
                          <TableCell align="right" sx={{ width: 120, minWidth: 120 }}>
                            <IconButton size="small" sx={{ color: '#00695c' }} onClick={() => handleEdit(factor, 'greenSink')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(factor)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* 添加/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? '添加' : '编辑'}
          {dialogType === 'fossil' ? '化石燃料' : dialogType === 'fugitive' ? '逸散' : dialogType === 'indirect' ? '间接' : '绿地碳汇'}排放因子
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {dialogType === 'fossil' && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="燃料类型（中文）"
                value={formData.fuelTypeCn}
                onChange={(e) => setFormData({ ...formData, fuelTypeCn: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="燃料类型（英文）"
                value={formData.fuelTypeEn}
                onChange={(e) => setFormData({ ...formData, fuelTypeEn: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="排放因子"
                value={formData.emissionFactor}
                onChange={(e) => setFormData({ ...formData, emissionFactor: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="单位"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="GWP"
                value={formData.gwp}
                onChange={(e) => setFormData({ ...formData, gwp: e.target.value })}
              />
            </>
          )}
          
          {dialogType === 'fugitive' && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="气体名称（中文）"
                value={formData.gasNameCn}
                onChange={(e) => setFormData({ ...formData, gasNameCn: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="气体名称（英文）"
                value={formData.gasNameEn}
                onChange={(e) => setFormData({ ...formData, gasNameEn: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="GWP值"
                type="number"
                value={formData.gwpValue}
                onChange={(e) => setFormData({ ...formData, gwpValue: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="排放因子"
                value={formData.emissionFactor}
                onChange={(e) => setFormData({ ...formData, emissionFactor: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="单位"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>分类</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="分类"
                >
                  <MenuItem value="airConditioning">空调系统</MenuItem>
                  <MenuItem value="fireSuppression">灭火系统</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          
          {dialogType === 'indirect' && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="排放类型（中文）"
                value={formData.emissionTypeCn}
                onChange={(e) => setFormData({ ...formData, emissionTypeCn: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="排放类型（英文）"
                value={formData.emissionTypeEn}
                onChange={(e) => setFormData({ ...formData, emissionTypeEn: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="排放因子"
                value={formData.emissionFactor}
                onChange={(e) => setFormData({ ...formData, emissionFactor: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="单位"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="备注"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </>
          )}

          {dialogType === 'greenSink' && (
            <>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>植被类型</InputLabel>
                <Select
                  value={formData.vegetationType}
                  onChange={(e) => setFormData({ ...formData, vegetationType: e.target.value })}
                  label="植被类型"
                >
                  {GREEN_SINK_VEGETATION_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                margin="normal"
                label="排放因子"
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
                value={formData.greenSinkEmissionFactor}
                onChange={(e) => setFormData({ ...formData, greenSinkEmissionFactor: e.target.value })}
                required
              />
              <TextField
                fullWidth
                margin="normal"
                label="单位"
                value={GREEN_SINK_UNIT}
                InputProps={{ readOnly: true }}
                helperText="绿地碳汇因子固定单位"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} startIcon={<CancelIcon />}>
            取消
          </Button>
          <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NewEmissionFactorManagementPage;

