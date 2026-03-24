import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Collapse, Box, CircularProgress, Typography,
  useMediaQuery, useTheme, TablePagination, Checkbox
} from '@mui/material';
import { Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import TableRowDetail from './TableRowDetail';
import { formatNumber } from '../utils/formatNumber';

const HistoricalDataTable = ({ 
  data, 
  loading, 
  onDelete, 
  onBatchDelete,
  onSaveEdit,
  page = 0,
  pageSize = 50,
  total = 0,
  onPageChange,
  onPageSizeChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [editingRowKey, setEditingRowKey] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 切换页码时清空选择
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

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
    // 使用requestAnimationFrame延迟状态更新，避免阻塞UI
    requestAnimationFrame(() => {
      setEditingRowKey(id);
      if (!expandedRowKeys.includes(id)) {
        setExpandedRowKeys([...expandedRowKeys, id]);
      }
    });
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

  const dataIds = (data || []).map(r => r._id || r.id).filter(Boolean);
  const handleSelectAll = () => {
    if (selectedIds.size === dataIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(dataIds));
    }
  };
  const handleToggleSelect = (id) => {
    if (!id) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleBatchDeleteClick = () => {
    if (selectedIds.size === 0 || !onBatchDelete) return;
    onBatchDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

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
      {selectedIds.size > 0 && onBatchDelete && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="body2" color="text.secondary">已选 {selectedIds.size} 条</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Delete />}
            onClick={handleBatchDeleteClick}
          >
            删除选中
          </Button>
        </Box>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ minWidth: 90 }}>
              <Checkbox
                indeterminate={dataIds.length > 0 && selectedIds.size > 0 && selectedIds.size < dataIds.length}
                checked={dataIds.length > 0 && selectedIds.size === dataIds.length}
                onChange={handleSelectAll}
                inputProps={{ 'aria-label': '全选' }}
              />
              <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>全选</Typography>
            </TableCell>
            <TableCell sx={{ minWidth: 80, fontWeight: 'bold' }}>年份</TableCell>
            <TableCell sx={{ minWidth: 120, fontWeight: 'bold', pl: 6 }}>行政区划</TableCell>
            <TableCell sx={{ minWidth: 120, fontWeight: 'bold' }}>单位名称</TableCell>
            <TableCell sx={{ minWidth: 120, fontWeight: 'bold', pl: 6 }}>总排放量 (tCO₂)</TableCell>
            <TableCell sx={{ 
              minWidth: 220, 
              textAlign: 'right',
              paddingRight: '16px'
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: { xs: 0.5, sm: 1 }
              }}>
                <Box component="span" sx={{ minWidth: 128, textAlign: 'right', mr: 3.8, fontWeight: 'bold' }}>修改时间</Box>
                <Box component="span" sx={{ minWidth: 80, textAlign: 'center', fontWeight: 'bold' }}>操作</Box>
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(record => {
            // 安全地获取排放量数据
            const totalEmissions = record?.calculatedEmissions?.totalEmissions;
            const displayEmissions = formatNumber(totalEmissions ?? 0);
            
            // 安全地获取地区名称
            const regionName = record?.regionName || record?.regionCode || '未知区域';
            
            // 确保有有效的 ID
            const recordId = record?._id || record?.id || `temp-${Math.random()}`;
            
            return (
              <React.Fragment key={recordId}>
                <TableRow hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(recordId)}
                      onChange={() => handleToggleSelect(recordId)}
                      disabled={!(record?._id || record?.id)}
                      inputProps={{ 'aria-label': `选择 ${regionName} ${record?.year}` }}
                    />
                  </TableCell>
                  <TableCell>{record?.year || '-'}</TableCell>
                  <TableCell>{regionName}</TableCell>
                  <TableCell>{record?.account?.unitName || '-'}</TableCell>
                  <TableCell sx={{ pl: 6 }}>{displayEmissions}</TableCell>
                  <TableCell sx={{ 
                    textAlign: 'right',
                    paddingRight: '16px' // 使用标准padding，与其他列保持一致
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: { xs: 0.5, sm: 1 }, 
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'flex-end' // 右对齐，让按钮向后靠
                    }}>
                      {(record?.updatedAt || record?.createdAt) && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                          {new Date(record.updatedAt || record.createdAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      )}
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
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse 
                      in={expandedRowKeys.includes(recordId)} 
                      timeout={200} 
                      unmountOnExit
                    >
                      <Box sx={{ margin: 1, width: '100%', boxSizing: 'border-box' }}>
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
      {/* 分页控件 */}
      <TablePagination
        component="div"
        count={total}
        page={page - 1} // MUI使用0-based索引
        onPageChange={onPageChange}
        rowsPerPage={pageSize}
        onRowsPerPageChange={onPageSizeChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="每页条数:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : `超过 ${to}`} 条`}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      />
    </TableContainer>
  );
};

export default HistoricalDataTable;
