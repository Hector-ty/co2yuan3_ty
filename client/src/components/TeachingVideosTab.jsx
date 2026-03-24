import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const TeachingVideosTab = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    file: null
  });
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 打开预览时通过鉴权接口拉取视频流并生成可播放的 blob URL；关闭时释放
  useEffect(() => {
    if (!previewVideo || !(previewVideo._id || previewVideo.id)) {
      setPreviewBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewLoading(true);
    const vid = previewVideo._id || previewVideo.id;
    const token = localStorage.getItem('token');
    axios
      .get(`${API_BASE_URL}/teaching-videos/${vid}/file`, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      .then((res) => {
        setPreviewBlobUrl(URL.createObjectURL(res.data));
      })
      .catch(() => setPreviewBlobUrl(null))
      .finally(() => setPreviewLoading(false));
    return () => {};
  }, [previewVideo?._id ?? previewVideo?.id]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsSuperAdmin(user?.role === 'superadmin');
      } catch {
        setIsSuperAdmin(false);
      }
    }
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_BASE_URL}/teaching-videos`);
      const list = res.data?.data || res.data || [];
      setVideos(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('获取教学视频列表失败:', err);
      if (err.response?.status === 404) {
        setError('教学视频功能后端接口未启用，请联系管理员在服务器端开启 /api/teaching-videos 接口。');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || '获取教学视频列表失败');
      }
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (video = null) => {
    if (!isSuperAdmin) return;
    setEditingVideo(video);
    setFormValues({
      title: video?.title || '',
      description: video?.description || '',
      file: null
    });
    setError('');
    setSuccess('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingVideo(null);
    setFormValues({
      title: '',
      description: '',
      file: null
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormValues((prev) => ({
        ...prev,
        file
      }));
    }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;

    const title = formValues.title.trim();
    const description = formValues.description.trim();

    if (!title) {
      setError('请填写视频标题');
      return;
    }

    if (!editingVideo && !formValues.file) {
      setError('请上传视频文件');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (formValues.file) {
        formData.append('file', formValues.file);
      }

      let savedVideo = null;
      if (editingVideo && (editingVideo._id || editingVideo.id)) {
        const id = editingVideo._id || editingVideo.id;
        const res = await axios.put(`${API_BASE_URL}/teaching-videos/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        savedVideo = res.data?.data;
      } else {
        const res = await axios.post(`${API_BASE_URL}/teaching-videos`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        savedVideo = res.data?.data;
      }

      setSuccess('教学视频保存成功');
      handleCloseDialog();
      await fetchVideos();
      // 保存成功后打开该视频的预览，显示视频而非表格
      if (savedVideo) {
        setPreviewVideo(savedVideo);
      }
    } catch (err) {
      console.error('保存教学视频失败:', err);
      setError(err.response?.data?.message || err.response?.data?.error || '保存教学视频失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (video) => {
    setPreviewVideo(video);
  };

  const handleClosePreview = () => {
    setPreviewVideo(null);
  };

  const handleDeleteRequest = (video) => {
    if (!isSuperAdmin) return;
    setDeleteConfirmVideo(video);
  };

  const handleDeleteCancel = () => {
    if (!deleting) setDeleteConfirmVideo(null);
  };

  const handleDeleteConfirm = async () => {
    const video = deleteConfirmVideo;
    if (!video || !isSuperAdmin) return;
    const vid = video._id || video.id;
    if (!vid) {
      setDeleteConfirmVideo(null);
      return;
    }
    try {
      setDeleting(true);
      setError('');
      await axios.delete(`${API_BASE_URL}/teaching-videos/${vid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (previewVideo && (previewVideo._id || previewVideo.id) === vid) {
        setPreviewVideo(null);
      }
      setSuccess('教学视频已删除');
      setDeleteConfirmVideo(null);
      await fetchVideos();
    } catch (err) {
      console.error('删除教学视频失败:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (video) => {
    const vid = video?._id || video?.id;
    if (!vid) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/teaching-videos/${vid}/file`, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      const baseName = (video?.originalFilename || video?.title || 'teaching-video').replace(/[/\\?%*:|"<>]/g, '-');
      link.download = baseName.includes('.') ? baseName : baseName + '.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载教学视频失败:', err);
      setError(err.response?.data?.message || err.response?.data?.error || '下载失败');
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Card>
        <CardHeader
          title="教学视频"
          titleTypographyProps={{
            variant: 'h5',
            fontWeight: 'bold',
            align: 'center',
          }}
          action={
            isSuperAdmin && (
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenDialog(null)}
              >
                上传教学视频
              </Button>
            )
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
              <CircularProgress />
            </Box>
          ) : videos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无教学视频。
            </Typography>
          ) : (
            <Grid container spacing={2} justifyContent="center">
              {videos.map((video) => (
                <Grid item xs={12} sm={6} md={4} key={video._id || video.id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* 长方形视频展示区域 16:9 */}
                    <CardActionArea
                      onClick={() => handlePreview(video)}
                      sx={{
                        aspectRatio: '16/9',
                        bgcolor: 'grey.900',
                        overflow: 'hidden',
                        display: 'block'
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          minHeight: 100,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'grey.500'
                        }}
                      >
                        <PlayArrowIcon sx={{ fontSize: 48 }} />
                      </Box>
                    </CardActionArea>
                    <CardContent sx={{ flexGrow: 1, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" noWrap title={video.title} gutterBottom>
                        {video.title}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Button
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={(e) => { e.stopPropagation(); handlePreview(video); }}
                        >
                          查看
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={(e) => { e.stopPropagation(); handleDownload(video); }}
                          disabled={!video.url}
                        >
                          下载
                        </Button>
                        {isSuperAdmin && (
                          <>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={(e) => { e.stopPropagation(); handleOpenDialog(video); }}
                            >
                              修改
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={(e) => { e.stopPropagation(); handleDeleteRequest(video); }}
                            >
                              删除
                            </Button>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingVideo ? '修改教学视频' : '上传教学视频'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            fullWidth
            label="视频标题"
            value={formValues.title}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                title: e.target.value
              }))
            }
          />
          <TextField
            margin="normal"
            fullWidth
            multiline
            minRows={2}
            label="视频简介"
            value={formValues.description}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                description: e.target.value
              }))
            }
          />
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" component="label" disabled={saving}>
              选择视频文件
              <input type="file" hidden accept="video/*" onChange={handleFileChange} />
            </Button>
            {formValues.file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                已选择：{formValues.file.name}
              </Typography>
            )}
            {editingVideo && !formValues.file && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                如不重新选择文件，将保留当前视频文件。
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving} variant="contained">
            {saving ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!previewVideo} onClose={handleClosePreview} maxWidth="md" fullWidth>
        <DialogTitle>{previewVideo?.title || '预览教学视频'}</DialogTitle>
        <DialogContent>
          {previewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : previewBlobUrl ? (
            <Box sx={{ mt: 1 }}>
              <video
                src={previewBlobUrl}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '70vh', borderRadius: 4 }}
              />
              {previewVideo?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {previewVideo.description}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {previewVideo?.url ? '加载视频失败，请重试。' : '当前视频没有可用的播放地址，请联系管理员。'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirmVideo} onClose={handleDeleteCancel}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除教学视频《{deleteConfirmVideo?.title}》吗？删除后不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            取消
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeachingVideosTab;

