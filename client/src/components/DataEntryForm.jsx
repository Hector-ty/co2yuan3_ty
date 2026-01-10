import React, { useState, useEffect, useRef } from 'react';
import { Button, Grid, TextField, Accordion, AccordionSummary, AccordionDetails, Typography, Box, Autocomplete, List, ListItem, ListItemText, Collapse, Select, InputLabel, FormControl, Card, CardHeader, CardContent, Stack, useMediaQuery, useTheme } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useForm, Controller } from 'react-hook-form';
import { formSections } from './formFields';
import axios from 'axios'; // 导入 axios

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const LOCAL_STORAGE_KEY = 'carbon_form_data';

const DataEntryForm = ({ regions, onSubmit, initialValues, isEditMode = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Determine initial regionCode based on user data from localStorage
  const getInitialRegionCode = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // If not root user and has a region, use it as default
      if (user.email !== 'root@root.com' && user.region) {
        return user.region;
      }
    }
    return ''; // Default to empty if no specific user region or is root
  };

  const [emissionFactors, setEmissionFactors] = useState({}); // 新增：存储从数据库获取的排放因子
  const [factorsLoading, setFactorsLoading] = useState(true); // 新增：排放因子加载状态
  const [factorsError, setFactorsError] = useState(null); // 新增：排放因子错误状态
  const [expandedSection, setExpandedSection] = useState(null); // 新增：跟踪哪个模块被激活
  const sectionRefs = useRef({}); // 新增：存储模块的ref引用

  const { control, handleSubmit, reset, watch, setValue } = useForm({
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
  const [isRootUser, setIsRootUser] = useState(false); // State for root user status
  const [regionSelectOpen, setRegionSelectOpen] = useState(false); // 控制行政区划下拉开合

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

  // Effect for fetching user info
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    let tempUserRegion = '';
    let tempIsRootUser = false;

    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.email === 'root@root.com') {
        tempIsRootUser = true;
      } else {
        tempUserRegion = user.region;
      }
    }
    setCurrentUserRegion(tempUserRegion);
    setIsRootUser(tempIsRootUser);
  }, []);

  // Effect for fetching emission factors
  useEffect(() => {
    const fetchEmissionFactors = async () => {
      setFactorsLoading(true);
      setFactorsError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/emission-factors`);
        const formattedFactors = {};
        response.data.forEach(factor => {
          if (!formattedFactors[factor.category]) {
            formattedFactors[factor.category] = {};
          }
          if (factor.category === 'mobile' && (factor.type === 'fuel' || factor.type === 'mileage')) {
            if (!formattedFactors[factor.category][factor.type]) {
              formattedFactors[factor.category][factor.type] = {};
            }
            formattedFactors[factor.category][factor.type][factor.name] = factor.value;
          } else {
            formattedFactors[factor.category][factor.name] = factor.value;
          }
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
      const flattenedData = {
        year: initialValues.year,
        regionCode: initialValues.regionCode,
        ...initialValues.activityData.fossilFuels?.solid,
        ...initialValues.activityData.fossilFuels?.liquid,
        ...initialValues.activityData.fossilFuels?.gas,
        ...initialValues.activityData.mobileSources,
        ...initialValues.activityData.indirectEmissions,
        ...initialValues.activityData.intensityMetrics,
      };
      reset(flattenedData);
    } else {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        reset(JSON.parse(savedData));
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
    } else if (category === 'mobileSources' && emissionFactors.mobile?.[type]?.[fuel]) {
        const factor = emissionFactors.mobile[type][fuel];
        emission = (value * factor) / 1000;
    } else if (category === 'indirectEmissions' && emissionFactors.indirect) {
        if (type === 'purchasedElectricity') emission = value * 10 * emissionFactors.indirect.electricity;
        else if (type === 'purchasedHeat') emission = value * (emissionFactors.indirect.heat / 1000);
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
                        min: 0 
                    }
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={4} sx={{ textAlign: 'right' }}>
          {emissionValue > 0 && (
            <Typography variant="caption" color="textSecondary">
              ≈ {emissionValue.toFixed(2)} tCO₂
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        {/* 模块一：行政区划与数据年份（独立卡片） */}
        <Card
          ref={(el) => {
            if (el) {
              sectionRefs.current['region-year'] = el;
            }
          }}
          onClick={(e) => {
            // 仅在桌面端处理点击
            if (!isMobile) {
              e.stopPropagation();
              setExpandedSection(expandedSection === 'region-year' ? null : 'region-year');
            }
          }}
          sx={{
            cursor: !isMobile ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: expandedSection === 'region-year' && !isMobile ? 'scale(1.05)' : 'scale(1)',
            zIndex: expandedSection === 'region-year' && !isMobile ? 10 : 1,
            position: 'relative',
            boxShadow: expandedSection === 'region-year' && !isMobile
              ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': !isMobile ? {
              boxShadow: expandedSection === 'region-year' && !isMobile
                ? '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(25, 118, 210, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.15)',
            } : {}
          }}
        >
          <CardHeader title="行政区划与数据年份" />
          <CardContent>
            <Controller
            name="regionCode"
            control={control}
            rules={{ required: '请选择行政区划' }}
            render={({ field, fieldState: { error } }) => (
              <FormControl fullWidth error={!!error} sx={{ mb: 3 }}>
                <InputLabel id="region-select-label">行政区划</InputLabel>
                <Select
                  {...field}
                  labelId="region-select-label"
                  label="行政区划"
                  disabled={isEditMode || (!isRootUser && currentUserRegion)}
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
            )}
          />
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
                sx={{ mb: 1 }}
              />
            )}
          />
          </CardContent>
        </Card>

        {/* 模块二到五：两行两列布局（使用 CSS Grid，确保占满整行且间距可控） */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          columnGap: { xs: 2, md: 3 }, 
          rowGap: { xs: 2, md: 0 }, 
          width: '100%' 
        }}>
          <Box sx={{ width: '100%', aspectRatio: { xs: 'auto', md: '2.6 / 1' }, minHeight: { xs: 'auto', md: 0 } }}>
            {renderSectionCard(formSections[0])}
          </Box>
          <Box sx={{ width: '100%', aspectRatio: { xs: 'auto', md: '2.6 / 1' }, minHeight: { xs: 'auto', md: 0 } }}>
            {renderSectionCard(formSections[1])}
          </Box>
        </Box>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          columnGap: { xs: 2, md: 3 }, 
          rowGap: { xs: 2, md: 0 }, 
          width: '100%', 
          mt: { xs: 2, md: 0 } 
        }}>
          <Box sx={{ width: '100%', aspectRatio: { xs: 'auto', md: '2.6 / 1' }, minHeight: { xs: 'auto', md: 0 } }}>
            {renderSectionCard(formSections[2])}
          </Box>
          <Box sx={{ width: '100%', aspectRatio: { xs: 'auto', md: '2.6 / 1' }, minHeight: { xs: 'auto', md: 0 } }}>
            {renderSectionCard(formSections[3])}
          </Box>
        </Box>

        {/* 模块六：提交/清空（独立卡片，无标题，紧凑高度） */}
        <Card>
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
              )}
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </form>
  );
};

export default DataEntryForm;
