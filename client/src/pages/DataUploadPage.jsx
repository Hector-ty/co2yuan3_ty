import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx'; // 导入 xlsx 库用于前端解析文件头部
import { formatNumber } from '../utils/formatNumber';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const DataUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [dbFields, setDbFields] = useState([]); // CarbonData 数据库字段
  const [mappingTemplates, setMappingTemplates] = useState([]); // 用户保存的映射模板
  const [selectedTemplateId, setSelectedTemplateId] = useState(''); // 当前选中的模板ID
  const [showMappingDialog, setShowMappingDialog] = useState(false); // 控制映射对话框显示
  const [currentMappingName, setCurrentMappingName] = useState(''); // 新建/编辑模板名称
  const [currentMappings, setCurrentMappings] = useState({}); // 当前编辑的映射规则 { fileColumn: dbFieldPath }
  const [fileColumns, setFileColumns] = useState([]); // 上传文件后解析出的列名
  const [uploadResults, setUploadResults] = useState([]); // 后端返回的上传结果和错误报告
  const [mappingError, setMappingError] = useState(null); // 映射对话框的错误信息

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploadError(null);
    setUploadSuccess(null);
    setUploadResults([]); // 清空之前的上传结果

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        const buffer = e.target.result;
        let columns = [];
        if (file.type === 'text/csv') {
          // For CSV, read first line to get headers
          const firstLine = new TextDecoder().decode(buffer.slice(0, buffer.indexOf('\n')));
          columns = firstLine.split(',').map(col => col.trim());
        } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
          // For Excel, use xlsx to get headers from the first sheet
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          // 支持多级表头：如果前两行都是字符串，则合并它们
          if (rawData.length >= 2) {
            const row1 = rawData[0] || [];
            const row2 = rawData[1] || [];
            
            // 检查第二行是否包含"上年"、"当年"等关键词，如果是则认为是多级表头
            const isMultiLevelHeader = row2.some(cell => 
              typeof cell === 'string' && (cell.includes('上年') || cell.includes('当年') || cell.includes('费用'))
            );
            
            if (isMultiLevelHeader) {
              // 合并两行作为列名
              columns = row1.map((col1, index) => {
                const col2 = row2[index] || '';
                if (col2 && col2 !== col1) {
                  return `${col1}_${col2}`;
                }
                return col1 || col2 || `列${index + 1}`;
              });
            } else {
              // 单级表头，只使用第一行
              columns = row1;
            }
          } else {
            columns = rawData[0] || [];
          }
        }
        setFileColumns(columns);
        setCurrentMappings(
          columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
        );
        setShowMappingDialog(true); // 自动打开映射对话框
      };
      reader.readAsArrayBuffer(file);
    }

    setFiles(acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    })));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false // 暂时只允许上传单个文件进行映射
  });

  // 获取数据库字段和映射模板
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [fieldsRes, templatesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/data-mapping/fields`),
          axios.get(`${API_BASE_URL}/data-mapping`)
        ]);
        // 后端现在返回的是对象数组 [{path, label}, ...]
        // 保持兼容性：如果是字符串数组，转换为对象数组
        const fields = Array.isArray(fieldsRes.data) && fieldsRes.data.length > 0
          ? (typeof fieldsRes.data[0] === 'string' 
              ? fieldsRes.data.map(path => ({ path, label: path }))
              : fieldsRes.data)
          : [];
        setDbFields(fields);
        setMappingTemplates(templatesRes.data);
      } catch (err) {
        console.error('获取初始数据失败:', err);
        setUploadError('获取数据库字段或映射模板失败。');
      }
    };
    fetchInitialData();
  }, []);

  const handleRemoveFile = (fileToRemove) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    setFileColumns([]);
    setCurrentMappings({});
    setShowMappingDialog(false);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError('请选择要上传的文件。');
      return;
    }
    if (!selectedTemplateId) {
      setUploadError('请选择或创建一个数据映射模板。');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadResults([]);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('templateId', selectedTemplateId);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/data`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadSuccess(response.data.message || '文件上传成功！');
      setUploadResults(response.data.results || []);
      setUploadError(response.data.errors && response.data.errors.length > 0 ? '部分数据导入失败，请查看详情。' : null);
      setFiles([]); // Clear files after successful upload
      setFileColumns([]);
      setCurrentMappings({});
      setSelectedTemplateId('');
    } catch (err) {
      setUploadError(err.response?.data?.message || '文件上传失败。');
      console.error('文件上传失败:', err);
      setUploadResults(err.response?.data?.results || []);
    } finally {
      setUploading(false);
    }
  };

  const handleMappingChange = (fileColumn, dbField) => {
    setCurrentMappings(prev => ({ ...prev, [fileColumn]: dbField }));
  };

  const handleSaveTemplate = async () => {
    setMappingError(null);
    if (!currentMappingName.trim()) {
      setMappingError('模板名称不能为空。');
      return;
    }
    if (Object.values(currentMappings).every(val => !val)) {
      setMappingError('请至少映射一个文件列到数据库字段。');
      return;
    }

    try {
      const payload = {
        templateName: currentMappingName,
        mappings: currentMappings
      };
      let response;
      const existingTemplate = mappingTemplates.find(t => t.templateName === currentMappingName);

      if (existingTemplate) {
        response = await axios.put(`${API_BASE_URL}/data-mapping/${existingTemplate._id}`, payload);
      } else {
        response = await axios.post(`${API_BASE_URL}/data-mapping`, payload);
      }
      
      setMappingTemplates(prev => {
        if (existingTemplate) {
          return prev.map(t => (t._id === response.data._id ? response.data : t));
        }
        return [...prev, response.data];
      });
      setSelectedTemplateId(response.data._id);
      setShowMappingDialog(false);
      setMappingError(null);
      alert(`映射模板 "${currentMappingName}" 保存成功！`);
    } catch (err) {
      setMappingError(err.response?.data?.message || '保存映射模板失败。');
      console.error('保存映射模板失败:', err);
    }
  };

  const handleSelectTemplate = (event) => {
    const templateId = event.target.value;
    setSelectedTemplateId(templateId);
    if (templateId === 'new') {
      setCurrentMappingName('');
      setCurrentMappings(fileColumns.reduce((acc, col) => ({ ...acc, [col]: '' }), {}));
      setShowMappingDialog(true);
    } else if (templateId) {
      const template = mappingTemplates.find(t => t._id === templateId);
      if (template) {
        setCurrentMappingName(template.templateName);
        setCurrentMappings(template.mappings);
        setShowMappingDialog(true);
      }
    } else {
      setCurrentMappingName('');
      setCurrentMappings({});
      setShowMappingDialog(false);
    }
  };

  const handleDownloadErrorLog = (errors) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["文件名", "行号", "错误信息"].join(",") + "\n"
      + errors.flatMap(fileError => 
          fileError.errors.map(rowError => 
            `${fileError.filename},${rowError.row},"${rowError.messages.join('; ')}"`
          )
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "error_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        数据上传与映射
      </Typography>

      {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
      {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 4 },
          mb: 3,
          textAlign: 'center',
          cursor: 'pointer',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderStyle: 'dashed',
          borderWidth: 2,
          backgroundColor: isDragActive ? 'action.hover' : 'background.default',
          transition: 'background-color 0.3s ease'
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: { xs: 40, sm: 60 }, color: 'text.secondary', mb: 2 }} />
        {isDragActive ? (
          <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            将文件拖拽到此处...
          </Typography>
        ) : (
          <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            拖拽文件到此处，或点击选择文件
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          支持文件类型: .csv, .xlsx, .xls (一次只能上传一个文件进行映射)
        </Typography>
      </Paper>

      <Button
        variant="contained"
        component="label"
        startIcon={<CloudUploadIcon />}
        sx={{ mb: 3 }}
        fullWidth
      >
        选择文件
        <input type="file" hidden {...getInputProps()} />
      </Button>

      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            已选择文件:
          </Typography>
          <List dense>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(file)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={file.name} secondary={`${formatNumber(file.size / 1024)} KB`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>选择或创建映射模板</InputLabel>
        <Select
          value={selectedTemplateId}
          label="选择或创建映射模板"
          onChange={handleSelectTemplate}
        >
          <MenuItem value="">
            <em>无</em>
          </MenuItem>
          {mappingTemplates.map(template => (
            <MenuItem key={template._id} value={template._id}>
              {template.templateName}
            </MenuItem>
          ))}
          <MenuItem value="new">
            <em>+ 创建新模板</em>
          </MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleUpload}
        disabled={files.length === 0 || uploading || !selectedTemplateId}
        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
      >
        {uploading ? '上传中...' : '开始上传'}
      </Button>

      {uploadResults.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            上传结果:
          </Typography>
          {uploadResults.map((result, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: result.status === 'success' ? 'success.light' : 'error.light' }}>
              <Typography variant="h6">{result.filename}</Typography>
              <Typography>状态: {result.status === 'success' ? '成功' : '失败'}</Typography>
              {result.insertedCount !== undefined && (
                <Typography>成功导入记录: {result.insertedCount}</Typography>
              )}
              {result.failedCount !== undefined && (
                <Typography>失败记录: {result.failedCount}</Typography>
              )}
              {result.errors && result.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">详细错误:</Typography>
                  <List dense>
                    {result.errors.map((errorItem, errorIndex) => (
                      <ListItem key={errorIndex}>
                        <ListItemText primary={`行 ${errorItem.row}: ${errorItem.messages.join('; ')}`} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleDownloadErrorLog(result.errors)}
                    sx={{ mt: 1 }}
                  >
                    下载错误报告
                  </Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      )}

      <Dialog open={showMappingDialog} onClose={() => setShowMappingDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTemplateId && selectedTemplateId !== 'new' ? '编辑映射模板' : '创建新映射模板'}
        </DialogTitle>
        <DialogContent>
          {mappingError && <Alert severity="error" sx={{ mb: 2 }}>{mappingError}</Alert>}
          <TextField
            margin="dense"
            label="模板名称"
            fullWidth
            value={currentMappingName}
            onChange={(e) => setCurrentMappingName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            文件列名 ↔ 数据库字段
          </Typography>
          <List>
            {fileColumns.map((col, index) => (
              <ListItem key={index} divider>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{col}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                    <Typography variant="body1">→</Typography>
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>选择数据库字段</InputLabel>
                      <Select
                        value={currentMappings[col] || ''}
                        label="选择数据库字段"
                        onChange={(e) => handleMappingChange(col, e.target.value)}
                      >
                        <MenuItem value="">
                          <em>忽略此列</em>
                        </MenuItem>
                        {dbFields.map((field) => {
                          // 兼容处理：field 可能是字符串或对象
                          const fieldPath = typeof field === 'string' ? field : field.path;
                          const fieldLabel = typeof field === 'string' ? field : field.label;
                          return (
                            <MenuItem key={fieldPath} value={fieldPath}>
                              {fieldLabel}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMappingDialog(false)} startIcon={<CancelIcon />}>
            取消
          </Button>
          <Button onClick={handleSaveTemplate} startIcon={<SaveIcon />} variant="contained">
            保存模板
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataUploadPage;
