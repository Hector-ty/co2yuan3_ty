import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Collapse, Box, CircularProgress, Typography,
  useMediaQuery, useTheme
} from '@mui/material';
import { Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import TableRowDetail from './TableRowDetail';

const HistoricalDataTable = ({ data, loading, onSelect, onDelete, onSaveEdit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [editingRowKey, setEditingRowKey] = useState('');

  const toggleRowExpansion = (id) => {
    const newExpandedRowKeys = expandedRowKeys.includes(id)
      ? expandedRowKeys.filter(key => key !== id)
      : [...expandedRowKeys, id];
    setExpandedRowKeys(newExpandedRowKeys);
    if (!newExpandedRowKeys.includes(id)) {
      setEditingRowKey('');
    }
  };

  const handleEdit = (id) => {
    setEditingRowKey(id);
    if (!expandedRowKeys.includes(id)) {
      setExpandedRowKeys([...expandedRowKeys, id]);
    }
  };

  const handleSave = () => {
    setEditingRowKey('');
    onSaveEdit();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 数据验证和空值处理
  if (!data || !Array.isArray(data)) {
    return (
      <TableContainer component={Paper}>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>暂无数据</Typography>
        </Box>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <TableContainer component={Paper}>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>暂无历史提交记录</Typography>
        </Box>
      </TableContainer>
    );
  }

  return (
    <TableContainer 
      component={Paper}
      sx={{
        overflowX: isMobile ? 'auto' : 'hidden', // 移动端启用水平滚动，桌面端隐藏
        overflowY: 'hidden', // 隐藏垂直滚动条
        '& .MuiTable-root': {
          minWidth: 600,
          width: '100%' // 确保表格占满容器宽度
        }
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 80 }}>年份</TableCell>
            <TableCell sx={{ minWidth: 120 }}>行政区划</TableCell>
            <TableCell sx={{ minWidth: 120 }}>总排放量 (tCO₂)</TableCell>
            <TableCell sx={{ 
              minWidth: 150, 
              textAlign: 'right',
              paddingRight: '16px' // 使用标准padding，去掉多余的空白
            }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                position: 'relative'
              }}>
                <Box sx={{
                  position: 'absolute',
                  left: '88%', 
                  transform: 'translateX(-50%)',
                  width: '100%',
                  textAlign: 'center'
                }}>
                  操作
                </Box>
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(record => {
            // 安全地获取排放量数据
            const totalEmissions = record?.calculatedEmissions?.totalEmissions;
            const displayEmissions = totalEmissions !== undefined && totalEmissions !== null 
              ? totalEmissions.toFixed(2) 
              : '0.00';
            
            // 安全地获取地区名称
            const regionName = record?.regionName || record?.regionCode || '未知区域';
            
            // 确保有有效的 ID
            const recordId = record?._id || record?.id || `temp-${Math.random()}`;
            
            return (
              <React.Fragment key={recordId}>
                <TableRow hover>
                  <TableCell>{record?.year || '-'}</TableCell>
                  <TableCell>{regionName}</TableCell>
                  <TableCell>{displayEmissions}</TableCell>
                  <TableCell sx={{ 
                    textAlign: 'right',
                    paddingRight: '16px' // 使用标准padding，与其他列保持一致
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: { xs: 0.5, sm: 1 }, 
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end' // 右对齐，让按钮向后靠
                    }}>
                      <Button 
                        size="small" 
                        onClick={() => onSelect(record)}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        图表
                      </Button>
                      <IconButton 
                        size="small" 
                        onClick={() => onDelete(recordId)}
                        sx={{ padding: { xs: '4px', sm: '8px' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => toggleRowExpansion(recordId)}
                        sx={{ padding: { xs: '4px', sm: '8px' } }}
                      >
                        {expandedRowKeys.includes(recordId) ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                    <Collapse in={expandedRowKeys.includes(recordId)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 1 }}>
                        <TableRowDetail
                          record={record}
                          isEditing={editingRowKey === recordId}
                          onEdit={() => handleEdit(recordId)}
                          onSave={handleSave}
                          onCancel={() => setEditingRowKey('')}
                        />
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default HistoricalDataTable;
