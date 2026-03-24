import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { keyframes } from '@emotion/react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Chip,
  Alert
} from '@mui/material';
import { 
  Edit, 
  LocalFireDepartment, 
  Air, 
  Bolt, 
  Whatshot,
  TrendingUp,
  Park
} from '@mui/icons-material';

const gradientFlow = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 200% 0; }
`;
import InlineEditForm from './InlineEditForm';
import ErrorBoundary from './ErrorBoundary';
import { formatNumber } from '../utils/formatNumber';

const TableRowDetail = ({ record, isEditing, onEdit, onSave, onCancel }) => {
  // 重要：所有 hooks 必须在组件顶层调用，不能在条件语句中调用
  // 即使 isEditing 为 true，也必须调用所有 hooks，然后使用条件渲染
  
  // 打开编辑时立即渲染表单，使数据框中的数据自动加载显示（已移除延迟，不再需要 shouldRenderForm）

  // 计算排放数据 - 必须在条件返回之前调用
  const emissionData = useMemo(() => {
    if (!record || !record.calculatedEmissions) {
      return {
        items: [],
        total: 0
      };
    }
    
    const breakdown = record.calculatedEmissions?.breakdown || {};
    const total = record.calculatedEmissions?.totalEmissions || 0;
    
    // 不要在这里创建React元素，而是存储图标组件类型
    const items = [
      {
        label: '化石燃料燃烧',
        value: breakdown.fossilFuels || 0,
        iconType: 'LocalFireDepartment',
        color: '#ff6b35',
        description: '直接排放'
      },
      {
        label: '逸散排放',
        value: breakdown.fugitiveEmissions || 0,
        iconType: 'Air',
        color: '#4ecdc4',
        description: '直接排放'
      },
      {
        label: '外购电力',
        value: breakdown.electricity || 0,
        iconType: 'Bolt',
        color: '#ffe66d',
        description: '间接排放'
      },
      {
        label: '外购热力',
        value: breakdown.heat || 0,
        iconType: 'Whatshot',
        color: '#ff8c42',
        description: '间接排放'
      },
      {
        label: '绿地碳汇(扣减)',
        value: breakdown.totalGreenSink ?? 0,
        iconType: 'Park',
        color: '#2e7d32',
        description: '碳汇扣减'
      }
    ];
    
    return { items, total };
  }, [record]);
  
  // 根据iconType渲染对应的图标 - 必须在条件返回之前调用
  const renderIcon = useCallback((iconType) => {
    switch (iconType) {
      case 'LocalFireDepartment':
        return <LocalFireDepartment />;
      case 'Air':
        return <Air />;
      case 'Bolt':
        return <Bolt />;
      case 'Whatshot':
        return <Whatshot />;
      case 'Park':
        return <Park />;
      default:
        return null;
    }
  }, []);

  // 计算百分比 - 必须在条件返回之前调用
  const getPercentage = useCallback((value, total) => {
    if (!total || total === 0) return formatNumber(0);
    return formatNumber((value / total) * 100);
  }, []);

  // 所有 hooks 已经调用完毕，现在可以使用条件渲染
  if (isEditing) {
    // 确保 record 有有效的 ID 作为 key，并且 record 存在
    if (!record) {
      return (
        <Alert severity="error">
          数据记录不存在，无法编辑
        </Alert>
      );
    }
    // 使用稳定的 key，避免每次渲染都创建新的 key 导致组件重新挂载
    const recordKey = record?._id || record?.id || 'unknown';
    
    // 使用错误边界包裹表单组件，防止渲染错误导致白屏
    return (
      <ErrorBoundary>
        <InlineEditForm 
          key={recordKey} 
          record={record} 
          onSave={onSave} 
          onCancel={onCancel} 
        />
      </ErrorBoundary>
    );
  }

  // 安全检查record
  if (!record) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">数据记录不存在</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          分类排放详情
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<Edit />} 
          onClick={() => onEdit && onEdit()}
          size="small"
          sx={{ 
            textTransform: 'none',
            borderRadius: 2
          }}
        >
          编辑数据
        </Button>
      </Box>

      {/* 总排放量卡片 */}
      <Card 
        elevation={2}
        sx={{ 
          mb: 3, 
          background: 'linear-gradient(90deg, #2e7d32 0%, #43a047 25%, #81c784 50%, #43a047 75%, #2e7d32 100%)',
          backgroundSize: '200% 100%',
          animation: `${gradientFlow} 5s linear infinite`,
          color: 'white'
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TrendingUp />
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
              总排放量
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {formatNumber(emissionData.total)} tCO₂
          </Typography>
        </CardContent>
      </Card>

      {/* 分类排放详情：四模块总宽与总排放量一致，一行四列；使用 flex 避免表格内 Grid 的负边距问题 */}
      {emissionData.items.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 2,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {emissionData.items.map((item, index) => {
            const percentage = getPercentage(item.value, emissionData.total);
            return (
              <Box
                key={index}
                sx={{
                  flex: '1 1 calc(25% - 12px)',
                  minWidth: 0,
                  display: 'flex',
                }}
              >
                <Card
                  elevation={1}
                  sx={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      elevation: 3,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: { xs: 2, sm: 1.5 }, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box
                          sx={{
                            p: 0.5,
                            borderRadius: 1.5,
                            bgcolor: `${item.color}18`,
                            color: item.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '& .MuiSvgIcon-root': { fontSize: 18 },
                          }}
                        >
                          {renderIcon(item.iconType)}
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                          {item.label}
                        </Typography>
                        <Chip
                          label={item.description}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            flexShrink: 0,
                            bgcolor: item.description === '直接排放' ? '#e3f2fd' : '#fff3e0',
                            color: item.description === '直接排放' ? '#1976d2' : '#f57c00',
                          }}
                        />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: item.color, lineHeight: 1.3 }}>
                        {formatNumber(item.value)} tCO₂
                      </Typography>
                      {emissionData.total > 0 && (
                        <Box sx={{ mt: 0.25 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                            <Typography variant="caption" color="text.secondary">占比</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{percentage}%</Typography>
                          </Box>
                          <Box
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'grey.200',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${percentage}%`,
                                bgcolor: item.color,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
};

// 使用 memo 优化性能，避免不必要的重新渲染
export default memo(TableRowDetail);
