import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Typography,
  Alert,
  LinearProgress,
  Paper,
  Divider,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Description, PictureAsPdf, Assessment, PlaylistAddCheck, Download, CheckCircle, Error as ErrorIcon, HourglassEmpty, FolderZip } from '@mui/icons-material';
import axios from 'axios';

const BATCH_POLL_INTERVAL_MS = 2500;

const CarbonReportExportTab = ({ regions }) => {
  const [cityCode, setCityCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [year, setYear] = useState('');
  const [recordId, setRecordId] = useState('');
  const [institutionOptions, setInstitutionOptions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null); // 'docx' | 'pdf'
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const [batchSelectedIds, setBatchSelectedIds] = useState([]);
  const [batchFormat, setBatchFormat] = useState('docx');
  const [batchJobId, setBatchJobId] = useState(null);
  const [batchJob, setBatchJob] = useState(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const batchPollRef = useRef(null);

  const yearOptions = [2022, 2023, 2024, 2025];

  // 与数据大屏模块保持一致的下拉菜单样式（深色背景 + 白色文字）
  const dropdownMenuProps = {
    PaperProps: {
      sx: {
        maxHeight: 300,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        color: 'white',
      },
    },
  };

  // 读取当前登录用户，用于根据角色锁定市/区县筛选范围
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const role = currentUser?.role;
  const userRegion = currentUser?.region ? String(currentUser.region) : '';

  // 从用户的 region 推导所属市级编码（如 150101 -> 150100）
  const userCityCode = userRegion
    ? (() => {
        if (userRegion.length === 6 && userRegion.endsWith('00')) return userRegion;
        if (userRegion.length === 6) return `${userRegion.substring(0, 4)}00`;
        const match = userRegion.match(/^(\d{4})/);
        if (match) return `${match[1]}00`;
        return '';
      })()
    : '';

  const userDistrictCode =
    role === 'district_admin' && userRegion && userRegion.length === 6 ? userRegion : '';

  const isCityLocked = role === 'city_admin' || role === 'district_admin';
  const isDistrictLocked = role === 'district_admin';

  // 根据用户角色自动预填市/区县
  useEffect(() => {
    if (!role || !userRegion) return;

    // 区县级管理员：锁定本市 + 本区县
    if (role === 'district_admin') {
      if (userCityCode) setCityCode(userCityCode);
      if (userDistrictCode) setDistrictCode(userDistrictCode);
      return;
    }

    // 市级管理员：锁定本市，只预填市，不预填区县（允许在本市内部切换区县）
    if (role === 'city_admin') {
      if (userCityCode) setCityCode(userCityCode);
      return;
    }
  }, [role, userRegion, userCityCode, userDistrictCode]);

  // 切换“市”时重置区县和机构（区县管理员除外，区县管理员的市/区县是锁定的）
  useEffect(() => {
    if (role === 'district_admin') {
      return;
    }
    setDistrictCode('');
    setRecordId('');
    setInstitutionOptions([]);
  }, [cityCode, role]);

  useEffect(() => {
    setRecordId('');
    setInstitutionOptions([]);
  }, [districtCode]);

  useEffect(() => {
    if (!districtCode || !year) {
      setInstitutionOptions([]);
      setRecordId('');
      return;
    }
    const fetchInstitutions = async () => {
      setLoadingInstitutions(true);
      setError('');
      try {
        const res = await axios.get('/api/carbon-data', {
          params: { regionCode: districtCode, year: Number(year), limit: 500 },
        });
        const data = res.data?.data || [];
        const options = data.map((item) => {
          const account = item.account;
          const unitName = (account && (account.unitName || account.name)) || '未知机构';
          return { id: item._id, label: unitName };
        });
        setInstitutionOptions(options);
        if (options.length === 0) setRecordId('');
        else if (!options.find((o) => o.id === recordId)) setRecordId('');
      } catch (err) {
        setError(err.response?.data?.error || '获取机构列表失败');
        setInstitutionOptions([]);
        setRecordId('');
      } finally {
        setLoadingInstitutions(false);
      }
    };
    fetchInstitutions();
  }, [districtCode, year]);

  const districtListRaw = cityCode ? (regions.find((c) => c.code === cityCode)?.children || []) : [];
  const districtList =
    role === 'district_admin' && userDistrictCode
      ? districtListRaw.filter((d) => d.code === userDistrictCode)
      : districtListRaw;

  const availableCities =
    role === 'city_admin' || role === 'district_admin'
      ? (regions || []).filter((c) => !userCityCode || c.code === userCityCode)
      : regions || [];
  const canExport = Boolean(recordId) && !exporting;

  const batchRunning = batchJob?.status === 'running';
  const canBatchByRegion = Boolean(districtCode && year && !batchSubmitting && !batchRunning);
  const batchSelectedSet = new Set(batchSelectedIds);
  const selectAllBatch = () => setBatchSelectedIds(institutionOptions.map((o) => o.id));
  const clearAllBatch = () => setBatchSelectedIds([]);
  const toggleBatchOne = (id) => {
    setBatchSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const startBatchExport = async (payload) => {
    setBatchSubmitting(true);
    setError('');
    try {
      const res = await axios.post('/api/reports/carbon-report-batch', payload);
      const jobId = res.data?.jobId;
      if (jobId) {
        setBatchJobId(jobId);
        setBatchJob({ status: 'running', total: 0, completed: 0, results: [] });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || '创建批量任务失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchExportAll = () => {
    if (!districtCode || !year) return;
    startBatchExport({ regionCode: districtCode, year: Number(year), format: batchFormat });
  };

  const handleBatchExportSelected = () => {
    if (batchSelectedIds.length === 0) return;
    startBatchExport({ recordIds: batchSelectedIds, format: batchFormat });
  };

  useEffect(() => {
    if (!batchJobId) return;
    const poll = async () => {
      try {
        const res = await axios.get(`/api/reports/carbon-report-batch/${batchJobId}`);
        const data = res.data;
        setBatchJob({
          status: data.status,
          format: data.format,
          total: data.total,
          completed: data.completed,
          results: data.results || [],
        });
        if (data.status !== 'running') {
          if (batchPollRef.current) clearInterval(batchPollRef.current);
          batchPollRef.current = null;
        }
      } catch (_) {}
    };
    poll();
    batchPollRef.current = setInterval(poll, BATCH_POLL_INTERVAL_MS);
    return () => {
      if (batchPollRef.current) clearInterval(batchPollRef.current);
    };
  }, [batchJobId]);

  const handleBatchDownload = (token, filename) => {
    if (!token) return;
    axios
      .get('/api/reports/carbon-report-download', { params: { token }, responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || '报告.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(() => setError('下载失败，链接可能已过期'));
  };

  const handleBatchZipDownload = () => {
    if (!batchJobId) return;
    const token = localStorage.getItem('token');
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get(`/api/reports/carbon-report-batch/${batchJobId}/download-zip`, {
        responseType: 'blob',
        headers: authHeader,
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        const cd = res.headers['content-disposition'] || res.headers['Content-Disposition'] || '';
        const match = cd.match(/filename\*=UTF-8''(.+)/);
        a.download = match ? decodeURIComponent(match[1]) : '碳排放报告_批量导出.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(async (err) => {
        let msg = '打包下载失败';
        const data = err.response?.data;
        if (data) {
          if (typeof data === 'string') msg = data;
          else if (data instanceof Blob) {
            try {
              const text = await data.text();
              const obj = JSON.parse(text);
              msg = obj.error || obj.message || msg;
            } catch (_) {}
          } else if (data.error) msg = data.error;
        }
        setError(msg);
      });
  };

  const statusLabel = (status) => {
    if (status === 'pending') return '排队中';
    if (status === 'processing') return '生成中';
    if (status === 'done') return '已完成';
    if (status === 'error') return '失败';
    return status;
  };

  const handleExport = async (format) => {
    if (!recordId) return;
    setExporting(true);
    setExportingFormat(format);
    setError('');
    setExportProgress(0);
    setExportStatus('正在连接…');

    const token = localStorage.getItem('token');
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    const streamUrl = `/api/reports/carbon-report-stream?id=${encodeURIComponent(recordId)}&format=${encodeURIComponent(format)}`;
    abortRef.current = new AbortController();

    try {
      const res = await fetch(streamUrl, {
        method: 'GET',
        headers: { ...authHeader },
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = '导出失败';
        try {
          const obj = JSON.parse(text);
          msg = obj.error || obj.message || msg;
        } catch (_) {}
        setError(msg);
        setExporting(false);
        setExportingFormat(null);
        setExportProgress(0);
        setExportStatus('');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        const processBlock = (block) => {
          let ev = '';
          let dt = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) ev = line.slice(7).trim();
            else if (line.startsWith('data: ')) dt = line.slice(6);
          }
          if (!ev || !dt) return null;
          try {
            return { event: ev, data: JSON.parse(dt) };
          } catch (_) {
            return null;
          }
        };

        for (const block of parts) {
          const parsed = processBlock(block);
          if (!parsed) continue;
          const { event: ev, data } = parsed;
          if (ev === 'progress') {
            setExportProgress(data.progress ?? 0);
            setExportStatus(data.message || '');
          } else if (ev === 'done') {
            const downloadToken = data.downloadToken;
            const filename = data.filename || `碳排放报告.${format}`;
            if (downloadToken) {
              const blobRes = await axios.get('/api/reports/carbon-report-download', {
                params: { token: downloadToken },
                responseType: 'blob',
              });
              const url = window.URL.createObjectURL(new Blob([blobRes.data]));
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
            }
            setExportProgress(100);
            setExportStatus('导出成功，文件已下载');
            setTimeout(() => {
              setExporting(false);
              setExportingFormat(null);
              setExportProgress(0);
              setExportStatus('');
            }, 1500);
            return;
          } else if (ev === 'error') {
            setError(data.error || '导出失败');
            setExporting(false);
            setExportingFormat(null);
            setExportProgress(0);
            setExportStatus('');
            return;
          }
        }
      }

      if (buffer.trim()) {
        const parsed = (() => {
          let ev = '';
          let dt = '';
          for (const line of buffer.split('\n')) {
            if (line.startsWith('event: ')) ev = line.slice(7).trim();
            else if (line.startsWith('data: ')) dt = line.slice(6);
          }
          if (!ev || !dt) return null;
          try {
            return { event: ev, data: JSON.parse(dt) };
          } catch (_) {
            return null;
          }
        })();
        if (parsed?.event === 'done' && parsed.data?.downloadToken) {
          const blobRes = await axios.get('/api/reports/carbon-report-download', {
            params: { token: parsed.data.downloadToken },
            responseType: 'blob',
          });
          const url = window.URL.createObjectURL(new Blob([blobRes.data]));
          const a = document.createElement('a');
          a.href = url;
          a.download = parsed.data.filename || `碳排放报告.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          setExportProgress(100);
          setExportStatus('导出成功，文件已下载');
          setTimeout(() => {
            setExporting(false);
            setExportingFormat(null);
            setExportProgress(0);
            setExportStatus('');
          }, 1500);
          return;
        }
        if (parsed?.event === 'error') {
          setError(parsed.data?.error || '导出失败');
        }
      }

      setExporting(false);
      setExportingFormat(null);
      setExportProgress(0);
      setExportStatus('');
    } catch (err) {
      if (err.name === 'AbortError') {
        setExportStatus('已取消');
        setExportProgress(0);
        setTimeout(() => {
          setExporting(false);
          setExportingFormat(null);
          setExportStatus('');
        }, 1500);
        return;
      }
      const msg =
        err.response?.data?.error ||
        err.message ||
        '生成超时或网络异常，请稍后重试';
      setError(msg);
      setExporting(false);
      setExportingFormat(null);
      setExportProgress(0);
      setExportStatus('');
      console.error('导出碳排放报告失败:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardHeader
          avatar={<Assessment sx={{ fontSize: 28, color: 'primary.main' }} />}
          title="导出碳排放报告"
          subheader="按地区与机构选择后，导出该机构该年度的碳排放报告（DOCX/PDF）"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            pb: 2,
            '& .MuiCardHeader-subheader': { mt: 0.5 },
          }}
        />
        <CardContent sx={{ pt: 3, pb: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            筛选条件
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              alignItems: 'flex-start',
            }}
          >
            <FormControl size="small" fullWidth disabled={isCityLocked}>
              <InputLabel>市</InputLabel>
              <Select
                value={cityCode}
                label="市"
                onChange={(e) => setCityCode(e.target.value)}
                MenuProps={dropdownMenuProps}
              >
                <MenuItem value="">
                  <em>请选择市</em>
                </MenuItem>
                {availableCities.map((city) => (
                  <MenuItem key={city.code} value={city.code}>
                    {city.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth disabled={!cityCode || isDistrictLocked}>
              <InputLabel>区县</InputLabel>
              <Select
                value={districtCode}
                label="区县"
                onChange={(e) => setDistrictCode(e.target.value)}
                MenuProps={dropdownMenuProps}
              >
                <MenuItem value="">
                  <em>请选择区县</em>
                </MenuItem>
                {districtList.map((d) => (
                  <MenuItem key={d.code} value={d.code}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>数据年份</InputLabel>
              <Select
                value={year}
                label="数据年份"
                onChange={(e) => setYear(e.target.value)}
                MenuProps={dropdownMenuProps}
              >
                <MenuItem value="">
                  <em>请选择年份</em>
                </MenuItem>
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}年
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth disabled={!districtCode || !year}>
              <InputLabel>机构</InputLabel>
              <Select
                value={recordId}
                label="机构"
                onChange={(e) => setRecordId(e.target.value)}
                MenuProps={dropdownMenuProps}
                renderValue={(v) => {
                  const opt = institutionOptions.find((o) => o.id === v);
                  return opt ? opt.label : v ? '未知机构' : '';
                }}
              >
                <MenuItem value="">
                  {loadingInstitutions ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} /> 加载中…
                    </Box>
                  ) : (
                    <em>请选择机构</em>
                  )}
                </MenuItem>
                {institutionOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            导出格式
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              size="medium"
              sx={{ minWidth: 130 }}
              startIcon={exportingFormat === 'docx' ? <CircularProgress size={18} color="inherit" /> : <Description />}
              onClick={() => handleExport('docx')}
              disabled={!canExport}
            >
              导出 DOCX
            </Button>
            <Button
              variant="outlined"
              size="medium"
              sx={{ minWidth: 130 }}
              startIcon={exportingFormat === 'pdf' ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdf />}
              onClick={() => handleExport('pdf')}
              disabled={!canExport}
            >
              导出 PDF
            </Button>
          </Box>

          {exporting && (
            <Paper
              variant="outlined"
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {exportStatus}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={() => abortRef.current?.abort()}
                  disabled={!abortRef.current}
                >
                  取消导出
                </Button>
              </Box>
              <LinearProgress
                variant="determinate"
                value={exportProgress}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {exportProgress < 100 ? `进度 ${Math.round(exportProgress)}%` : '已完成'}
              </Typography>
            </Paper>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            批量导出
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            可多选机构，或一键导出当前区县+年份下全部机构（单次最多 30 个），报告将排队生成。
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>批量格式</InputLabel>
              <Select
                value={batchFormat}
                label="批量格式"
                onChange={(e) => setBatchFormat(e.target.value)}
                MenuProps={dropdownMenuProps}
              >
                <MenuItem value="docx">DOCX</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<PlaylistAddCheck />}
              onClick={handleBatchExportAll}
              disabled={!canBatchByRegion || institutionOptions.length === 0}
            >
              导出当前区县+年份全部（共 {institutionOptions.length} 个）
            </Button>
            <Button
              variant="contained"
              size="medium"
              startIcon={batchSubmitting ? <CircularProgress size={18} color="inherit" /> : <PlaylistAddCheck />}
              onClick={handleBatchExportSelected}
              disabled={batchSelectedIds.length === 0 || batchSubmitting || batchRunning}
            >
              导出已选机构（已选 {batchSelectedIds.length} 个）
            </Button>
          </Box>
          {institutionOptions.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 220, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={institutionOptions.length > 0 && batchSelectedIds.length === institutionOptions.length}
                      indeterminate={batchSelectedIds.length > 0 && batchSelectedIds.length < institutionOptions.length}
                      onChange={(e) => (e.target.checked ? selectAllBatch() : clearAllBatch())}
                    />
                  }
                  label="全选"
                />
                <Button size="small" onClick={clearAllBatch}>
                  取消全选
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {institutionOptions.map((opt) => (
                  <FormControlLabel
                    key={opt.id}
                    control={
                      <Checkbox
                        checked={batchSelectedSet.has(opt.id)}
                        onChange={() => toggleBatchOne(opt.id)}
                      />
                    }
                    label={opt.label}
                    sx={{ mr: 0 }}
                  />
                ))}
              </Box>
            </Paper>
          )}

          {batchJobId && batchJob && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                批量任务进度
                {batchJob.status === 'running' && (
                  <Typography component="span" variant="body2" color="primary" sx={{ ml: 1 }}>
                    已生成 {batchJob.completed}/{batchJob.total}
                  </Typography>
                )}
                {batchJob.status === 'completed' && (
                  <Typography component="span" variant="body2" color="success.main" sx={{ ml: 1 }}>
                    全部完成
                  </Typography>
                )}
              </Typography>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>序号</TableCell>
                      <TableCell>机构</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchJob.results.map((r, idx) => (
                      <TableRow key={r.recordId}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{r.institutionName || r.recordId}</TableCell>
                        <TableCell>
                          {r.status === 'pending' && <HourglassEmpty fontSize="small" color="action" />}
                          {r.status === 'processing' && <CircularProgress size={16} />}
                          {r.status === 'done' && <CheckCircle fontSize="small" color="success" />}
                          {r.status === 'error' && <ErrorIcon fontSize="small" color="error" />}
                          <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                            {statusLabel(r.status)}
                            {r.error && `：${r.error}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {r.status === 'done' && r.downloadToken && (
                            <Button
                              size="small"
                              startIcon={<Download />}
                              onClick={() => handleBatchDownload(r.downloadToken, r.filename)}
                            >
                              下载
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {batchJob.status === 'completed' && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<FolderZip />}
                    onClick={handleBatchZipDownload}
                  >
                    打包下载 (ZIP)
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setBatchJobId(null);
                      setBatchJob(null);
                    }}
                  >
                    关闭任务
                  </Button>
                </Box>
              )}
            </Paper>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, lineHeight: 1.6 }}>
            请依次选择市、区县、数据年份和机构，然后点击「导出 DOCX」或「导出 PDF」生成该机构该年度的碳排放报告。支持批量导出多个机构，报告生成可能包含 AI 撰写内容，耗时较长请耐心等待。
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CarbonReportExportTab;
