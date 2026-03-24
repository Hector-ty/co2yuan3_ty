import React, { useState, useEffect, useRef } from 'react';
import { Button, Grid, TextField, Accordion, AccordionSummary, AccordionDetails, Typography, Box, Autocomplete, List, ListItem, ListItemText, Collapse, Select, InputLabel, FormControl, Card, CardHeader, CardContent, Stack, useMediaQuery, useTheme } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useForm, Controller } from 'react-hook-form';
import { formSections } from './formFields';
import axios from 'axios';
import { formatNumber } from '../utils/formatNumber';
import { computeEmissionPreview } from '../utils/computeEmissionPreview';
import EmissionPreviewModal from './EmissionPreviewModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const LOCAL_STORAGE_KEY = 'carbon_form_data';

// 间接排放因子名称 → 规范键（与表单、预览、服务端一致）
const INDIRECT_FACTOR_KEY = { '外购电力': 'electricity', '外购热力': 'heat', '净外购电量': 'electricity', '净外购热力': 'heat' };
// 逸散排放因子名称 → 规范键（迁移数据 CO2_ext/FM200 等）
const FUGITIVE_FACTOR_KEY = { 'CO2_ext': 'CO2', FM200: 'HFC-227ea' };
// 化石燃料名称（中文或其它）→ 英文键，与 formFields 一致
const FOSSIL_FACTOR_KEY = {
  无烟煤: 'anthracite', 烟煤: 'bituminousCoal', 褐煤: 'lignite',
  燃料油: 'fuelOil', 汽油: 'gasoline', 柴油: 'diesel', 煤油: 'kerosene',
  液化石油气: 'lpg', 液化天然气: 'lng',
  天然气: 'naturalGas', 焦炉煤气: 'cokeOvenGas', 管道煤气: 'pipelineGas',
};
// 默认化石燃料排放因子（与 server/utils/emissionFactors 一致），DB 缺失时作 fallback
const DEFAULT_FOSSIL_FACTORS = {
  solid: { anthracite: 2.09, bituminousCoal: 1.79, lignite: 1.21 },
  liquid: { fuelOil: 3.05, gasoline: 3.04, diesel: 3.14, kerosene: 3.16, lpg: 2.92, lng: 2.59 },
  gas: { naturalGas: 21.62, cokeOvenGas: 8.57, pipelineGas: 7.00 },
};

const DataEntryForm = ({ regions, onSubmit, initialValues, isEditMode = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Determine initial regionCode based on user data from localStorage
  const getInitialRegionCode = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // If not superadmin and has a region, use it as default
      if (user.role !== 'superadmin' && user.region) {
        return user.region;
      }
    }
    return ''; // Default to empty if no specific user region or is superadmin
  };

  const [emissionFactors, setEmissionFactors] = useState({}); // 新增：存储从数据库获取的排放因子
  const [factorsLoading, setFactorsLoading] = useState(true); // 新增：排放因子加载状态
  const [factorsError, setFactorsError] = useState(null); // 新增：排放因子错误状态
  const [expandedSection, setExpandedSection] = useState(null); // 新增：跟踪哪个模块被激活
  const sectionRefs = useRef({}); // 新增：存储模块的ref引用

  const { control, handleSubmit, reset, watch, setValue, setFocus, formState: { errors } } = useForm({
    defaultValues: {
      regionCode: getInitialRegionCode(), // Initialize regionCode here
      year: '',
      ...formSections.flatMap(s => s.panels ? s.panels.flatMap(p => p.fields) : s.fields).reduce((acc, field) => {
        acc[field.name.join('.')] = '';
        return acc;
      }, {})
    }
  });
  const [singleItemEmissions, setSingleItemEmissions] = useState({});
  const [open, setOpen] = useState({});
  const [currentUserRegion, setCurrentUserRegion] = useState(''); // State for user's region
  const [currentUserRegionFullName, setCurrentUserRegionFullName] = useState(''); // State for user's region full name
  const [currentUserUnitName, setCurrentUserUnitName] = useState(''); // State for user's unit name
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // State for superadmin user status
  const [regionSelectOpen, setRegionSelectOpen] = useState(false); // 控制行政区划下拉开合
  const [isImporting, setIsImporting] = useState(false); // 批量导入状态
  const fileInputRef = useRef(null); // 批量导入文件输入
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [pendingSubmitValues, setPendingSubmitValues] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const watchedValues = watch();

  const handleCityClick = (cityCode) => {
    setOpen(prevOpen => ({ ...prevOpen, [cityCode]: !prevOpen[cityCode] }));
  };

  const handleRegionSelect = (regionCode, isDistrict = false) => {
    setValue('regionCode', regionCode);
    if (isDistrict) {
      setRegionSelectOpen(false); // 选择区县后收起
      setOpen({}); // 折叠已展开的城市列表
    }
  };

  // 获取完整地区名称的函数
  const getRegionFullName = (regionCode) => {
    if (!regions || regions.length === 0 || !regionCode) {
      return regionCode || '';
    }
    
    // 查找地区及其父级
    for (const city of regions) {
      if (city.code === regionCode) {
        return city.name; // 如果是城市，只返回城市名
      }
      // 查找区县
      if (city.children) {
        for (const district of city.children) {
          if (district.code === regionCode) {
            return `${city.name}/${district.name}`; // 返回"城市/区县"格式
          }
        }
      }
    }
    return regionCode; // 如果找不到，返回代码
  };

  // Effect for fetching user info
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    let tempUserRegion = '';
    let tempUserUnitName = '';
    let tempIsSuperAdmin = false;

    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role === 'superadmin') {
        tempIsSuperAdmin = true;
        tempUserUnitName = user.unitName || '';
      } else {
        tempUserRegion = user.region;
        tempUserUnitName = user.unitName || '';
        // 如果用户有地区，自动设置为表单值
        if (tempUserRegion) {
          setValue('regionCode', tempUserRegion);
        }
      }
    }
    setCurrentUserRegion(tempUserRegion);
    setCurrentUserUnitName(tempUserUnitName);
    setIsSuperAdmin(tempIsSuperAdmin);
  }, [setValue]);

  // Effect for updating region full name when regions are loaded
  useEffect(() => {
    if (currentUserRegion && regions && regions.length > 0) {
      const fullName = getRegionFullName(currentUserRegion);
      setCurrentUserRegionFullName(fullName);
    }
  }, [currentUserRegion, regions]);

  // Effect for fetching emission factors
  useEffect(() => {
    const fetchEmissionFactors = async () => {
      setFactorsLoading(true);
      setFactorsError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/emission-factors`);
        const formattedFactors = {};
        response.data.forEach(factor => {
          if (factor.category === 'fossil') {
            const t = factor.type;
            if (t && ['solid', 'liquid', 'gas'].includes(t)) {
              if (!formattedFactors[t]) formattedFactors[t] = {};
              const key = FOSSIL_FACTOR_KEY[factor.name] || factor.name;
              formattedFactors[t][key] = factor.value;
            }
            return;
          }
          if (!formattedFactors[factor.category]) {
            formattedFactors[factor.category] = {};
          }
          if (factor.category === 'mobile' && (factor.type === 'fuel' || factor.type === 'mileage')) {
            if (!formattedFactors[factor.category][factor.type]) {
              formattedFactors[factor.category][factor.type] = {};
            }
            formattedFactors[factor.category][factor.type][factor.name] = factor.value;
          } else {
            let key = factor.name;
            if (factor.category === 'indirect') key = INDIRECT_FACTOR_KEY[factor.name] || factor.name;
            else if (factor.category === 'fugitive') key = FUGITIVE_FACTOR_KEY[factor.name] || factor.name;
            else if (factor.category === 'solid' || factor.category === 'liquid' || factor.category === 'gas') key = FOSSIL_FACTOR_KEY[factor.name] || factor.name;
            else if (factor.category === 'greenSink') key = factor.name; // tree, shrub, herb
            formattedFactors[factor.category][key] = factor.value;
          }
        });
        // 绿地碳汇 fallback
        if (!formattedFactors.greenSink || typeof formattedFactors.greenSink !== 'object') {
          formattedFactors.greenSink = { tree: 0.25, shrub: 0.1, herb: 0.05 };
        }
        ['tree', 'shrub', 'herb'].forEach(k => {
          if (formattedFactors.greenSink[k] == null) formattedFactors.greenSink[k] = ({ tree: 0.25, shrub: 0.1, herb: 0.05 })[k];
        });
        // 化石燃料 fallback：DB 未提供的 solid/liquid/gas 键用默认值补齐，与后端 calculationEngine 一致
        ['solid', 'liquid', 'gas'].forEach(k => {
          if (!formattedFactors[k]) formattedFactors[k] = {};
          Object.entries(DEFAULT_FOSSIL_FACTORS[k]).forEach(([name, val]) => {
            if (formattedFactors[k][name] == null) formattedFactors[k][name] = val;
          });
        });
        setEmissionFactors(formattedFactors);
      } catch (err) {
        setFactorsError('获取排放因子失败');
        console.error('Error fetching emission factors:', err);
      } finally {
        setFactorsLoading(false);
      }
    };

    fetchEmissionFactors();
  }, []);

  // Effect for form reset based on edit mode or local storage
  useEffect(() => {
    if (isEditMode && initialValues) {
      const ad = initialValues.activityData || {};
      const flattenedData = {
        year: initialValues.year,
        regionCode: initialValues.regionCode,
        ...ad.fossilFuels?.solid,
        ...ad.fossilFuels?.liquid,
        ...ad.fossilFuels?.gas,
        ...ad.fugitiveEmissions?.airConditioning,
        ...ad.fugitiveEmissions?.fireSuppression,
        ...ad.greenSink,
        ...ad.mobileSources,
        ...ad.indirectEmissions,
        ...ad.intensityMetrics,
      };
      reset(flattenedData);
    } else {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        reset(JSON.parse(savedData));
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.role !== 'superadmin' && user.region) {
            setValue('regionCode', user.region);
          }
        }
      }
    }
  }, [initialValues, isEditMode, reset, setValue]);

  useEffect(() => {
    if (!isEditMode) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(watchedValues));
    }
  }, [watchedValues, isEditMode]);

  // 处理点击外部区域时关闭激活的模块（仅桌面端）
  useEffect(() => {
    if (isMobile || !expandedSection) return;

    const handleClickOutside = (event) => {
      const sectionKey = expandedSection;
      const sectionElement = sectionRefs.current[sectionKey];
      
      if (sectionElement && !sectionElement.contains(event.target)) {
        setExpandedSection(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedSection, isMobile]);

  const getNestedValue = (obj, path) => path.reduce((o, k) => (o && typeof o[k] !== 'undefined' ? o[k] : undefined), obj);

  const calculateEmission = (field) => {
    const value = getNestedValue(watchedValues, field.name);
    if (!value || value <= 0 || factorsLoading || factorsError) return 0; // 增加加载和错误检查

    const [category, type, fuel] = field.name;
    let emission = 0;
    
    if (category === 'fossilFuels' && emissionFactors[type] && emissionFactors[type][fuel]) {
        const factor = emissionFactors[type][fuel];
        emission = type === 'gas' ? (value / 10000) * factor : value * factor;
    } else if (category === 'fugitiveEmissions' && emissionFactors.fugitive) {
        // 逸散排放计算
        const gasName = fuel; // 气体名称，如 'HCFC-22', 'CO2' 等
        const factor = emissionFactors.fugitive[gasName];
        
        if (factor !== undefined && factor !== null) {
          // 逸散排放阈值（小于阈值时该部分排放取零）
          const fugitiveThresholds = {
            'HCFC-22': 1.29,
            'HFC-32': 3.27,
            'HFC-125': 0.67,
            'HFC-143a': 0.43,
            'HFC-245fa': 2.62,
            'CO2': 2.52,
            'HFC-227ea': 23.33
          };
          
          const threshold = fugitiveThresholds[gasName];
          // 如果值小于阈值，该部分排放取零
          if (threshold !== undefined && value < threshold) {
            return 0;
          }
          
          emission = value * factor;
        }
    } else if (category === 'mobileSources' && emissionFactors.mobile?.[type]?.[fuel]) {
        const factor = emissionFactors.mobile[type][fuel];
        emission = (value * factor) / 1000;
    } else if (category === 'indirectEmissions' && emissionFactors.indirect) {
        if (type === 'purchasedElectricity') emission = value * 10 * emissionFactors.indirect.electricity;
        else if (type === 'purchasedHeat') emission = value * emissionFactors.indirect.heat;
    } else if (category === 'greenSink' && emissionFactors.greenSink) {
        const veg = type; // tree, shrub, herb（两段路径时 type 为第二项）
        const factor = emissionFactors.greenSink[veg];
        if (factor != null) emission = value * factor;
    }
    return emission;
  };

  const handleClearForm = () => {
    reset({});
    if (!isEditMode) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    setSingleItemEmissions({});
  };

  // 触发文件选择
  const handleBulkImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 处理批量导入文件上传
  const handleBulkFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsImporting(true);
      const response = await axios.post(
        `${API_BASE_URL}/carbon-data/bulk-import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const message =
        response.data?.message ||
        `批量导入完成，成功导入 ${response.data?.successCount ?? 0} 条记录。`;
      window.alert(message);
    } catch (error) {
      console.error('批量导入失败:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        '批量导入失败，请检查文件格式或稍后重试。';
      window.alert(errorMessage);
    } finally {
      setIsImporting(false);
      // 清空 input 的值，避免选择同一文件时 onChange 不触发
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handlePreviewSubmit = (values) => {
    if (factorsLoading || factorsError) {
      window.alert('排放因子加载中或加载失败，请稍后再试');
      return;
    }
    const user = (() => {
      try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const preview = computeEmissionPreview(values, emissionFactors, user);
    setPendingSubmitValues(values);
    setPreviewData(preview);
    setPreviewOpen(true);
  };

  // 根据表单字段名得到其所在区块的 key（用于滚动与展开）
  const getSectionKeyForField = (fieldName) => {
    if (!fieldName || typeof fieldName !== 'string') return null;
    if (fieldName === 'regionCode') return 'unit-info';
    if (fieldName === 'year') return 'data-year';
    if (fieldName.startsWith('fossilFuels')) return '1';
    if (fieldName.startsWith('fugitiveEmissions')) return '2';
    if (fieldName.startsWith('indirectEmissions')) return '3';
    if (fieldName.startsWith('greenSink')) return '4';
    return null;
  };

  // 从可能嵌套的 formErrors 中取出第一个叶子字段路径与对应 message
  const getFirstErrorPathAndMessage = (formErrors, prefix = '') => {
    if (!formErrors || typeof formErrors !== 'object') return { path: null, message: null };
    const keys = Object.keys(formErrors);
    if (keys.length === 0) return { path: null, message: null };
    const firstKey = keys[0];
    const value = formErrors[firstKey];
    const path = prefix ? `${prefix}.${firstKey}` : firstKey;
    if (value && typeof value === 'object' && value.message === undefined && value.type === undefined) {
      const nested = getFirstErrorPathAndMessage(value, path);
      return nested.path ? nested : { path, message: value?.message };
    }
    return { path, message: value?.message || null };
  };

  const handleSubmitError = (formErrors) => {
    const { path: firstErrorFieldPath, message: firstErrorMessage } = getFirstErrorPathAndMessage(formErrors);
    const message = firstErrorMessage || '表单校验未通过，请检查必填项是否已填写完整。';
    if (!firstErrorFieldPath) {
      window.alert(message);
      return;
    }
    window.alert(message);
    const sectionKey = getSectionKeyForField(firstErrorFieldPath);
    setTimeout(() => {
      try {
        setFocus(firstErrorFieldPath);
      } catch {
        // 部分字段可能无法 setFocus，忽略
      }
      if (sectionKey && sectionRefs.current[sectionKey]) {
        sectionRefs.current[sectionKey].scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!isMobile && ['1', '2', '3', '4'].includes(sectionKey)) {
          setExpandedSection(sectionKey);
        }
      } else {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    }, 0);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingSubmitValues || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(pendingSubmitValues);
      setPreviewOpen(false);
      setPendingSubmitValues(null);
      setPreviewData(null);
    } catch {
      // 错误已由 useCarbonData  setError 处理，模态框保持打开便于用户返回修改或重试
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnEdit = () => {
    setPreviewOpen(false);
    setPendingSubmitValues(null);
    setPreviewData(null);
  };

  const renderFormItem = (field) => {
    const key = field.name.join('_');
    const fieldName = field.name.join('.');
    const emissionValue = calculateEmission(field);

    return (
      <Grid container key={key} spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={8}>
          <Controller
            name={fieldName}
            control={control}
            defaultValue=""
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                type="number"
                label={field.label}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                    inputProps: { 
                        min: 0,
                        step: 'any'  // 允许输入小数
                    }
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={4} sx={{ textAlign: 'right' }}>
          {emissionValue > 0 && (
            <Typography variant="caption" color="textSecondary">
              ≈ {formatNumber(emissionValue)} tCO₂e{field.name[0] === 'greenSink' ? ' (碳汇)' : ''}
            </Typography>
          )}
        </Grid>
      </Grid>
    );
  };

  const generateAccordions = (sections) => {
    return sections.map(section => (
      <Accordion key={section.key}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>{section.header}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {section.panels ? generateAccordions(section.panels) : section.fields.map(renderFormItem)}
        </AccordionDetails>
      </Accordion>
    ));
  };

  const renderSectionCard = (section) => {
    const isExpanded = expandedSection === section.key && !isMobile;
    
    return (
      <Card 
        key={section.key}
        ref={(el) => {
          if (el) {
            sectionRefs.current[section.key] = el;
          }
        }}
        onClick={(e) => {
          // 仅在桌面端处理点击
          if (!isMobile) {
            e.stopPropagation();
            setExpandedSection(isExpanded ? null : section.key);
          }
        }}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 0,
          cursor: !isMobile ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
          zIndex: isExpanded ? 10 : 1,
          position: 'relative',
          boxShadow: isExpanded 
            ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': !isMobile ? {
            boxShadow: isExpanded 
              ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)' 
              : '0 4px 12px rgba(0, 0, 0, 0.15)',
          } : {}
        }}
      >
        <CardHeader title={section.header} />
        <CardContent 
          sx={{ 
            flex: 1, 
            minHeight: 0, 
            overflow: 'auto',
            '&:hover': {
              // 防止CardContent的hover影响Card的样式
            }
          }}
        >
          {section.panels ? generateAccordions(section.panels) : section.fields.map(renderFormItem)}
        </CardContent>
      </Card>
    );
  };

  return (
    <form onSubmit={handleSubmit(handlePreviewSubmit, handleSubmitError)}>
      <Stack spacing={0}>
        {/* 标题模块 + 单位基本信息：无缝隙相连 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Card sx={{ borderRadius: 0 }}>
            <CardContent sx={{ py: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h5" 
                component="h1"
                sx={{ 
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  color: 'text.primary'
                }}
              >
                碳排放数据填报
              </Typography>
            </CardContent>
          </Card>
          <Card
            ref={(el) => {
              if (el) {
                sectionRefs.current['unit-info'] = el;
              }
            }}
            onClick={(e) => {
              // 仅在桌面端处理点击
              if (!isMobile) {
                e.stopPropagation();
                setExpandedSection(expandedSection === 'unit-info' ? null : 'unit-info');
              }
            }}
            sx={{
              borderRadius: 0,
              cursor: !isMobile ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: expandedSection === 'unit-info' && !isMobile ? 'scale(1.05)' : 'scale(1)',
            zIndex: expandedSection === 'unit-info' && !isMobile ? 10 : 1,
            position: 'relative',
            boxShadow: expandedSection === 'unit-info' && !isMobile
              ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': !isMobile ? {
              boxShadow: expandedSection === 'unit-info' && !isMobile
                ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.15)',
            } : {}
          }}
        >
          <CardHeader title="单位基本信息" />
          <CardContent>
            {/* 单位名称 - 自动获取用户注册时填写的单位名称 */}
            <TextField
              value={currentUserUnitName}
              label="单位名称"
              disabled={!isSuperAdmin}
              onChange={isSuperAdmin ? (e) => setCurrentUserUnitName(e.target.value) : undefined}
              fullWidth
              variant="outlined"
              helperText={isSuperAdmin ? '可修改单位名称，仅用于当前填报显示' : '使用注册时填写的单位名称'}
              sx={{
                mb: 3,
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#ffffff', // 白色字体
                  color: '#ffffff',
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)', // 标签颜色
                },
                '& .MuiInputLabel-root.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.5)',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-disabled fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: 'rgba(255, 255, 255, 0.6)',
                },
              }}
            />
            <Controller
            name="regionCode"
            control={control}
            rules={isSuperAdmin ? { required: '请选择行政区划' } : {}}
            render={({ field, fieldState: { error } }) => {
              // 对于非超级管理员，显示只读文本而不是选择器
              if (!isSuperAdmin && currentUserRegion) {
                // 获取完整地区名称（城市/区县格式）
                const userRegionName = currentUserRegionFullName || getRegionFullName(currentUserRegion) || currentUserRegion;
                
                return (
                  <FormControl fullWidth sx={{ mb: 1 }}>
                    <TextField
                      value={userRegionName}
                      label="行政区划"
                      disabled
                      fullWidth
                      variant="outlined"
                      helperText="使用注册时填写的行政区划"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#ffffff', // 白色字体
                          color: '#ffffff',
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.7)', // 标签颜色
                        },
                        '& .MuiInputLabel-root.Mui-disabled': {
                          color: 'rgba(255, 255, 255, 0.5)',
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-disabled fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                      }}
                    />
                    <input type="hidden" {...field} value={currentUserRegion} />
                  </FormControl>
                );
              }
              
              // 超级管理员或没有地区信息的用户，显示选择器
              return (
                <FormControl fullWidth error={!!error} sx={{ mb: 1 }}>
                  <InputLabel id="region-select-label">行政区划</InputLabel>
                  <Select
                    {...field}
                    labelId="region-select-label"
                    label="行政区划"
                    disabled={isEditMode}
                    open={regionSelectOpen}
                    onOpen={() => setRegionSelectOpen(true)}
                    onClose={() => setRegionSelectOpen(false)}
                    renderValue={(selected) => {
                      if (!regions || regions.length === 0) {
                        return selected || '加载中...';
                      }
                      const selectedRegion = regions.flatMap(c => [c, ...(c.children || [])]).find(r => r.code === selected);
                      return selectedRegion ? selectedRegion.name : selected;
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: '#1e1e1e !important',
                          backgroundImage: 'none',
                        },
                      },
                    }}
                  >
                    {regions.map((city) => (
                      <div key={city.code}>
                        <ListItem>
                          <Box 
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCityClick(city.code);
                            }} 
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              handleRegionSelect(city.code, false);
                            }}
                            sx={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}
                          >
                            <ListItemText primary={city.name} />
                            {Array.isArray(city.children) && city.children.length > 0 ? (open[city.code] ? <ExpandLess /> : <ExpandMore />) : null}
                          </Box>
                        </ListItem>
                        <Collapse in={open[city.code]} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {Array.isArray(city.children) && city.children.map((district) => (
                              <ListItem 
                                key={district.code} 
                                sx={{ pl: 4, cursor: 'pointer' }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRegionSelect(district.code, true);
                                }}
                              >
                                <ListItemText primary={district.name} />
                              </ListItem>
                            ))}
                          </List>
                        </Collapse>
                      </div>
                    ))}
                  </Select>
                  {error && <Typography color="error" variant="caption">{error.message}</Typography>}
                </FormControl>
              );
            }}
          />
          </CardContent>
        </Card>
        </Box>

        {/* 模块二：数据年份 */}
        <Card
          ref={(el) => {
            if (el) {
              sectionRefs.current['data-year'] = el;
            }
          }}
          onClick={(e) => {
            // 仅在桌面端处理点击
            if (!isMobile) {
              e.stopPropagation();
              setExpandedSection(expandedSection === 'data-year' ? null : 'data-year');
            }
          }}
          sx={{
            borderRadius: 0,
            cursor: !isMobile ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: expandedSection === 'data-year' && !isMobile ? 'scale(1.05)' : 'scale(1)',
            zIndex: expandedSection === 'data-year' && !isMobile ? 10 : 1,
            position: 'relative',
            boxShadow: expandedSection === 'data-year' && !isMobile
              ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': !isMobile ? {
              boxShadow: expandedSection === 'data-year' && !isMobile
                ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.15)',
            } : {}
          }}
        >
          <CardHeader title="数据年份" />
          <CardContent>
            <Controller
            name="year"
            control={control}
            rules={{ required: '请输入数据年份' }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                type="number"
                label="数据年份"
                fullWidth
                variant="outlined"
                error={!!error}
                helperText={error ? error.message : '例如: 2023'}
                disabled={isEditMode}
                InputProps={{
                  inputProps: {
                    step: 1  // 年份只允许整数
                  }
                }}
                sx={{ mb: 1 }}
              />
            )}
          />
          </CardContent>
        </Card>

        {/* 模块三到五：每个模块占满整行（和"单位基本信息"、"数据年份"模块一样宽） */}
        <Box sx={{ width: '100%' }}>
          {renderSectionCard(formSections[0])}
        </Box>
        <Box sx={{ width: '100%' }}>
          {renderSectionCard(formSections[1])}
        </Box>
        <Box sx={{ width: '100%' }}>
          {renderSectionCard(formSections[2])}
        </Box>
        <Box sx={{ width: '100%' }}>
          {renderSectionCard(formSections[3])}
        </Box>

        {/* 模块六：提交/清空/批量导入（独立卡片，无标题，紧凑高度） */}
        <Card sx={{ borderRadius: 0 }}>
          <CardContent sx={{ py: { xs: 1.5, sm: 2 }, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                fullWidth
                sx={{ 
                  minWidth: { xs: '100%', sm: 'auto' },
                  whiteSpace: 'nowrap' // 防止文字换行
                }}
              >
                {isEditMode ? '更新数据' : '提交数据'}
              </Button>
              {!isEditMode && (
                <>
                  <Button 
                    variant="outlined" 
                    onClick={handleClearForm}
                    fullWidth
                    sx={{ 
                      minWidth: { xs: '100%', sm: 'auto' },
                      whiteSpace: 'nowrap' // 防止文字换行
                    }}
                  >
                    清空表单
                  </Button>
                  {isSuperAdmin && (
                    <>
                      {/* 隐藏的文件输入，用于选择批量导入的 Excel 模板 */}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleBulkFileChange}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleBulkImportClick}
                        disabled={isImporting}
                        fullWidth
                        sx={{
                          minWidth: { xs: '100%', sm: 'auto' },
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isImporting ? '导入中...' : '批量导入数据'}
                      </Button>
                    </>
                  )}
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Stack>
      <EmissionPreviewModal
        open={previewOpen}
        onClose={handleReturnEdit}
        onConfirm={handleConfirmSubmit}
        preview={previewData}
        isSubmitting={isSubmitting}
        confirmLabel={isEditMode ? '确认并更新数据' : '确认并提交数据'}
      />
    </form>
  );
};

export default DataEntryForm;
