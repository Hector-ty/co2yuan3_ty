import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Button, 
  Grid, 
  Typography, 
  Box, 
  Alert, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { formSections } from './formFields';
import FormField from './FormField';

const InlineEditForm = ({ record, onSave, onCancel }) => {
  // 重要：所有 hooks 必须在组件顶层调用，不能在条件语句中调用
  // 即使 record 不存在，也必须调用所有 hooks，然后使用条件渲染
  
  // 获取 recordId，即使 record 不存在也继续执行
  const recordId = record?._id || record?.id || null;
  
  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const recordToUse = fetchedRecord || record;

  // 使用 useMemo 缓存默认值（优先用按 id 拉取的 recordToUse，若其 activityData 为空则回退到列表 record.activityData）
  const defaultValues = useMemo(() => {
    if (!recordToUse) return {};
    const ad = recordToUse?.activityData;
    const listAd = record?.activityData;
    // 优先 recordToUse.activityData；若为空对象或缺失，则用列表 record.activityData（列表含 activityData 时机构用户可直接编辑）
    const activityData = (ad && typeof ad === 'object' && !Array.isArray(ad) && Object.keys(ad).length > 0)
      ? ad
      : (listAd && typeof listAd === 'object' && !Array.isArray(listAd) ? listAd : ad || {});
    try {
      const defaults = {};
      
      // 确保 formSections 存在且是数组
      if (!formSections || !Array.isArray(formSections)) {
        return defaults;
      }
      
      formSections.forEach(section => {
        if (!section) return;
        
        if (section.panels && Array.isArray(section.panels)) {
          section.panels.forEach(panel => {
            if (!panel || !panel.fields || !Array.isArray(panel.fields)) return;
            
            panel.fields.forEach(field => {
              if (!field || !field.name || !Array.isArray(field.name)) return;
              
              const fieldName = field.name;
              if (fieldName.length < 3) return;
              
              const [category, type, name] = fieldName;
              const fieldKey = `${category}_${type}_${name}`;
              
              let value;
              try {
                // 优先嵌套路径（提交数据、批量导入经 convertFlatToNested 后均为嵌套）
                if (category === 'fossilFuels' && activityData.fossilFuels) {
                  value = activityData.fossilFuels[type]?.[name];
                } else if (category === 'fugitiveEmissions' && activityData.fugitiveEmissions) {
                  value = activityData.fugitiveEmissions[type]?.[name];
                }
                // 若嵌套取不到，尝试扁平 key（兼容历史或其它来源的扁平 activityData）
                if (value === undefined || value === null) {
                  const flatKey = `${category}.${type}.${name}`;
                  value = activityData[flatKey];
                }
                value = Number(value) || 0;
                if (!isFinite(value)) value = 0;
              } catch (e) {
                value = 0;
              }
              
              defaults[fieldKey] = value;
            });
          });
        } else if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach(field => {
            if (!field || !field.name || !Array.isArray(field.name)) return;
            
            const fieldName = field.name;
            if (fieldName.length < 2) return;
            
            const [category, name] = fieldName;
            const fieldKey = `${category}_${name}`;
            
            let value;
            try {
              // 优先嵌套路径（提交数据、批量导入经 convertFlatToNested 后均为嵌套）
              value = activityData[category]?.[name];
              // 若嵌套取不到，尝试扁平 key（兼容历史或其它来源的扁平 activityData）
              if (value === undefined || value === null) {
                value = activityData[`${category}.${name}`];
              }
              value = Number(value) || 0;
              if (!isFinite(value)) value = 0;
            } catch (e) {
              value = 0;
            }
            
            defaults[fieldKey] = value;
          });
        }
      });
      
      return defaults;
    } catch (error) {
      console.error('Error calculating default values:', error);
      return {};
    }
  }, [recordId, recordToUse?.activityData, recordToUse, record?.activityData, record]);

  // 确保 defaultValues 是一个有效的对象，并且包含所有必需的字段
  const safeDefaultValues = useMemo(() => {
    if (!defaultValues || typeof defaultValues !== 'object' || Array.isArray(defaultValues)) {
      return {};
    }
    const safe = { ...defaultValues };
    
    // 遍历 formSections，确保所有字段都在 safeDefaultValues 中
    if (formSections && Array.isArray(formSections)) {
      formSections.forEach(section => {
        if (section.panels && Array.isArray(section.panels)) {
          section.panels.forEach(panel => {
            if (panel.fields && Array.isArray(panel.fields)) {
              panel.fields.forEach(field => {
                if (field.name && Array.isArray(field.name) && field.name.length >= 3) {
                  const [category, type, name] = field.name;
                  const fieldKey = `${category}_${type}_${name}`;
                  if (!(fieldKey in safe)) {
                    safe[fieldKey] = 0;
                  }
                }
              });
            }
          });
        } else if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach(field => {
            if (field.name && Array.isArray(field.name) && field.name.length >= 2) {
              const [category, name] = field.name;
              const fieldKey = `${category}_${name}`;
              if (!(fieldKey in safe)) {
                safe[fieldKey] = 0;
              }
            }
          });
        }
      });
    }
    return safe;
  }, [defaultValues]);
  
  // 使用 useForm hook - 必须在每次渲染时调用
  // 确保 safeDefaultValues 始终是有效对象
  const formMethods = useForm({
    defaultValues: safeDefaultValues || {},
    mode: 'onBlur',
    shouldUnregister: false
  });
  
  // 解构 formMethods - 必须在每次渲染时调用
  // 添加安全检查，确保 formMethods 存在
  const { control, handleSubmit, reset, formState: { errors } } = formMethods || {};
  
  // 所有 useState hooks 必须在每次渲染时调用
  const [error, setError] = useState('');
  const [formInitError, setFormInitError] = useState(null);
  const [visibleSections, setVisibleSections] = useState(['1']);
  const [renderedSections, setRenderedSections] = useState(['1']);
  
  // 当 recordId 变化时，重置 sections 并清空按 id 拉取的缓存
  useEffect(() => {
    if (recordId) {
      setVisibleSections(['1']);
      setRenderedSections(['1']);
      setFetchedRecord(null);
      setDetailError('');
    }
  }, [recordId]);

  const fetchIdRef = useRef(0);
  // 打开编辑时按 id 拉取完整 activityData，解决机构用户列表未带全导致表单为空的问题
  useEffect(() => {
    if (!recordId) return;
    const id = (fetchIdRef.current += 1);
    setDetailLoading(true);
    axios.get(`/api/carbon-data/by-id/${recordId}`)
      .then((res) => {
        if (id !== fetchIdRef.current) return;
        const d = res.data?.data || res.data;
        if (!d) {
          setDetailError('服务器返回的数据不完整');
          setFetchedRecord(null);
          return;
        }
        setFetchedRecord(d);
        setDetailError('');
      })
      .catch((err) => {
        if (id !== fetchIdRef.current) return;
        setDetailError(err.response?.data?.error || (err.response?.status === 403 ? '无权限查看该条数据' : '加载详情失败'));
        setFetchedRecord(null);
      })
      .finally(() => {
        if (id !== fetchIdRef.current) return;
        setDetailLoading(false);
      });
  }, [recordId]);

  // 打开模块时用 recordToUse 数据填充表单
  useEffect(() => {
    if (recordId && reset && safeDefaultValues && Object.keys(safeDefaultValues).length > 0) {
      reset(safeDefaultValues);
    }
  }, [recordId, reset, safeDefaultValues]);
  
  // 在 useEffect 中检查表单是否初始化成功
  useEffect(() => {
    if (!control) {
      setFormInitError('表单控制器未初始化');
    } else {
      setFormInitError(null);
    }
  }, [control]);

  const onFinish = async (values) => {
    if (!recordToUse || !recordId) {
      setError('数据记录不存在');
      return;
    }

    const existingActivityData = recordToUse.activityData || {};
    const activityData = {
      fossilFuels: {
        solid: {},
        liquid: {},
        gas: {}
      },
      fugitiveEmissions: {
        airConditioning: {},
        fireSuppression: {}
      },
      greenSink: existingActivityData.greenSink ? { ...existingActivityData.greenSink } : { tree: 0, shrub: 0, herb: 0 },
      indirectEmissions: {},
      mobileSources: existingActivityData.mobileSources || {},
      intensityMetrics: existingActivityData.intensityMetrics || {}
    };

    Object.keys(values).forEach(key => {
      const parts = key.split('_');
      if (parts.length === 3) {
        const [category, type, name] = parts;
        if (category === 'fossilFuels') {
          activityData.fossilFuels[type][name] = Number(values[key]) || 0;
        } else if (category === 'fugitiveEmissions') {
          activityData.fugitiveEmissions[type][name] = Number(values[key]) || 0;
        }
      } else if (parts.length === 2) {
        const [category, name] = parts;
        if (category === 'indirectEmissions') {
          activityData.indirectEmissions[name] = Number(values[key]) || 0;
        } else if (category === 'greenSink') {
          activityData.greenSink[name] = Number(values[key]) || 0;
        }
      }
    });

    const payload = {
      year: recordToUse.year,
      regionCode: recordToUse.regionCode,
      activityData
    };

    try {
      const res = await axios.put(`/api/carbon-data/${recordId}`, payload);
      if (res.data.success) {
        onSave(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || '更新失败');
    }
  };

  const getUnitLabel = useCallback((category, type, name) => {
    if (category === 'fossilFuels') {
      if (type === 'solid' || type === 'liquid') {
        return ' (吨)';
      } else if (type === 'gas') {
        return ' (万立方米)';
      }
    } else if (category === 'fugitiveEmissions') {
      return ' (kg)';
    } else if (category === 'indirectEmissions') {
      if (name === 'purchasedElectricity') {
        return ' (万千瓦时)';
      } else if (name === 'purchasedHeat') {
        return ' (吉焦)';
      }
    }
    return '';
  }, []);

  const handleAccordionChange = useCallback((sectionKey) => (event, isExpanded) => {
    if (isExpanded) {
      setVisibleSections(prev => prev.includes(sectionKey) ? prev : [...prev, sectionKey]);
      // 展开时立即加入已渲染列表，使数据框自动加载显示，避免「加载中...」
      setRenderedSections(prev => prev.includes(sectionKey) ? prev : [...prev, sectionKey]);
    } else {
      setVisibleSections(prev => prev.filter(key => key !== sectionKey));
    }
    // 展开「间接排放」时滚动到视区内，避免在页面底部被遮挡
    if (isExpanded && sectionKey === '3') {
      setTimeout(() => {
        document.getElementById('indirect-emissions-accordion')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
    }
  }, []);

  const formSectionsMemo = useMemo(() => formSections, []);

  const renderFields = useCallback((fields, sectionKey) => {
    // 确保返回有效的React元素数组，而不是null
    if (!fields || !Array.isArray(fields) || !control || !safeDefaultValues) {
      return [];
    }
    
    const validFields = fields
      .filter(field => field && field.name && Array.isArray(field.name) && field.name.length >= 2)
      .map((field, index) => {
        const fieldName = field.name;
        const category = fieldName[0];
        const type = fieldName.length > 2 ? fieldName[1] : null;
        const name = fieldName.length > 2 ? fieldName[2] : fieldName[1];
        const fieldKey = type ? `${category}_${type}_${name}` : `${category}_${name}`;
        const unitLabel = getUnitLabel(category, type, name);

        // 确保FormField组件始终返回有效的React元素
        return (
          <FormField
            key={fieldKey || `field-${index}`}
            name={fieldKey}
            control={control}
            label={field.label || ''}
            unitLabel={unitLabel || ''}
          />
        );
      });
    
    // 确保返回数组，即使为空
    return validFields || [];
  }, [control, getUnitLabel, safeDefaultValues]);

  // 所有 hooks 已经调用完毕，现在可以使用条件渲染
  // 检查各种错误情况
  if (!record) {
    return <Alert severity="error">数据记录不存在，无法编辑</Alert>;
  }

  if (!recordId) {
    return <Alert severity="error">数据记录ID不存在，无法编辑</Alert>;
  }

  const hasActivityData = (a) => a && typeof a === 'object' && !Array.isArray(a) && Object.keys(a).length > 0;
  const canUseActivity = hasActivityData(recordToUse?.activityData) || hasActivityData(record?.activityData);
  if (detailLoading && !canUseActivity) {
    return (
      <Box sx={{ py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">加载中...</Typography>
      </Box>
    );
  }
  if (!canUseActivity) {
    return (
      <Alert severity="warning">{detailError || '数据记录的活动数据不存在，无法编辑'}</Alert>
    );
  }
  
  if (!control) {
    return <Alert severity="error">表单控制器未初始化</Alert>;
  }
  
  if (!safeDefaultValues || Object.keys(safeDefaultValues).length === 0) {
    return <Alert severity="warning">表单数据为空，无法编辑</Alert>;
  }
  
  if (formInitError) {
    return <Alert severity="error">{formInitError}</Alert>;
  }

  // 正常渲染表单
  // 确保 handleSubmit 存在，如果不存在则使用默认函数
  const safeHandleSubmit = handleSubmit || ((fn) => (e) => {
    e.preventDefault();
    if (fn) fn({});
  });
  
  return (
    <form onSubmit={safeHandleSubmit(onFinish)}>
      <Typography variant="h6" gutterBottom>直接编辑分类排放数据:</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {detailError && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setDetailError('')}>{detailError}</Alert>}
      
      <Box sx={{ pr: 1 }}>
        {formSectionsMemo && Array.isArray(formSectionsMemo) ? formSectionsMemo.map((section, sectionIndex) => {
          if (!section || !section.key) {
            return null;
          }
          
          const sectionKey = section.key || `section-${sectionIndex}`;
          const isExpanded = visibleSections.includes(sectionKey);
          const isRendered = renderedSections.includes(sectionKey);
          
          return (
            <Accordion 
              key={sectionKey}
              id={sectionKey === '3' ? 'indirect-emissions-accordion' : undefined}
              expanded={isExpanded}
              onChange={handleAccordionChange(sectionKey)}
              TransitionProps={{ timeout: 200 }}
              sx={{
                '& .MuiAccordionDetails-root': { pt: 0.5, pb: 1.5, px: 2, overflow: 'visible' },
                '& .MuiCollapse-root': { overflow: 'visible' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {section.header || '未命名分类'}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ overflow: 'visible' }}>
                {isRendered ? (
                  section.panels && Array.isArray(section.panels) ? (
                    section.panels.map((panel, panelIndex) => {
                      if (!panel || !panel.key) return null;
                      return (
                        <Box key={panel.key || `panel-${panelIndex}`} sx={{ mb: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                            {panel.header || '未命名面板'}
                          </Typography>
                          <Grid container spacing={1.5}>
                            {renderFields(panel.fields, sectionKey) || []}
                          </Grid>
                        </Box>
                      );
                    })
                  ) : (
                    <Box sx={{ width: '100%', overflow: 'visible', minHeight: 52 }}>
                      <Grid container spacing={1.5}>
                        {renderFields(section.fields, sectionKey) || []}
                      </Grid>
                    </Box>
                  )
                ) : (
                  <Box sx={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">加载中...</Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        }).filter(Boolean) : (
          <Alert severity="warning">表单配置数据无效</Alert>
        )}
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button type="submit" variant="contained">保存</Button>
        <Button variant="outlined" onClick={onCancel}>取消</Button>
      </Box>
    </form>
  );
};

export default InlineEditForm;
