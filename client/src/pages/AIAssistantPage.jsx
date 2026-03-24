import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, List, ListItemButton, ListItemText, Typography, CircularProgress } from '@mui/material';
import { AddComment, ArrowBack, DeleteOutline } from '@mui/icons-material';
import axios from 'axios';

// RAGFlow 嵌入配置（与 RAGFlow 嵌入代码一致）
const RAGFLOW_EMBED_BASE = 'http://localhost:8082/next-chats/share';
const RAGFLOW_ORIGIN = new URL(RAGFLOW_EMBED_BASE).origin; // 仅接受该 origin 的 postMessage
const RAGFLOW_SHARED_ID = '5acbd53eeef811f0845d2e213394407e';
const RAGFLOW_AUTH = 'EzMjA4MDNhZmRlZjExZjA4ZWM2NDZlOD';
const RAGFLOW_LOCALE = 'zh';

const CACHE_KEY_PREFIX = 'ai_assistant_history_cache_';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCacheKey() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? user?._id ?? user?.email ?? 'anonymous';
    return `${CACHE_KEY_PREFIX}${userId}`;
  } catch {
    return `${CACHE_KEY_PREFIX}anonymous`;
  }
}

function loadCachedHistory() {
  try {
    const raw = localStorage.getItem(getCacheKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedHistory(list) {
  try {
    localStorage.setItem(getCacheKey(), JSON.stringify(list));
  } catch (e) {
    console.warn('保存历史缓存失败', e);
  }
}

function buildEmbedSrc(conversationId = null) {
  const params = new URLSearchParams({
    shared_id: RAGFLOW_SHARED_ID,
    from: 'chat',
    auth: RAGFLOW_AUTH,
    locale: RAGFLOW_LOCALE,
  });
  if (conversationId) params.set('conversationId', conversationId);
  return `${RAGFLOW_EMBED_BASE}?${params.toString()}`;
}

// 统一视觉变量，保证顶栏、侧栏、列表风格一致
const tokens = {
  bg: '#0d0d0d',
  surface: '#141414',
  surfaceHover: 'rgba(255,255,255,0.06)',
  surfaceSelected: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.1)',
  text: '#e5e5e5',
  textSecondary: 'rgba(255,255,255,0.55)',
  spacing: 2,
  radius: 1.5,
};

export default function AIAssistantPage() {
  const [history, setHistory] = useState([]);
  const [iframeSrc, setIframeSrc] = useState(buildEmbedSrc());
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const fetchHistory = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setHistoryError('请先登录');
      return;
    }
    setHistoryError(null);
    setLoading(true);
    const cached = loadCachedHistory();
    if (cached.length > 0) {
      setHistory(cached);
      const latest = cached[0];
      setActiveId(latest.id);
      setIframeSrc(buildEmbedSrc(latest.conversationId || null));
    }
    axios
      .get('/api/ai/conversations', { headers: getAuthHeaders() })
      .then(async (res) => {
        let list = Array.isArray(res.data) ? res.data : [];
        setHistory(list);
        saveCachedHistory(list);
        setHistoryError(null);
        if (list.length === 0) {
          try {
            const createRes = await axios.post(
              '/api/ai/conversations',
              { title: `新对话 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` },
              { headers: getAuthHeaders() }
            );
            const newItem = createRes.data;
            list = [newItem];
            setHistory(list);
            saveCachedHistory(list);
            setActiveId(newItem.id);
            setIframeSrc(buildEmbedSrc(null));
          } catch (e) {
            setHistoryError(e.response?.data?.error || e.message || '创建会话失败');
          }
        } else {
          const latest = list[0];
          setActiveId(latest.id);
          setIframeSrc(buildEmbedSrc(latest.conversationId || null));
        }
      })
      .catch((err) => {
        const status = err.response?.status;
        const msg = status === 401
          ? '登录已过期，请重新登录'
          : (err.response?.data?.error || err.message || '加载历史对话失败');
        setHistoryError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  // 进入页先展示缓存再拉取接口
  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setHistoryError('请先登录');
      return;
    }
    setHistoryError(null);
    const cached = loadCachedHistory();
    if (cached.length > 0) {
      setHistory(cached);
      const latest = cached[0];
      setActiveId(latest.id);
      setIframeSrc(buildEmbedSrc(latest.conversationId || null));
    }
    axios
      .get('/api/ai/conversations', { headers: getAuthHeaders() })
      .then(async (res) => {
        if (cancelled) return;
        let list = Array.isArray(res.data) ? res.data : [];
        setHistory(list);
        saveCachedHistory(list);
        setHistoryError(null);
        if (list.length === 0) {
          try {
            const createRes = await axios.post(
              '/api/ai/conversations',
              { title: `新对话 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` },
              { headers: getAuthHeaders() }
            );
            if (cancelled) return;
            const newItem = createRes.data;
            list = [newItem];
            setHistory(list);
            saveCachedHistory(list);
            setActiveId(newItem.id);
            setIframeSrc(buildEmbedSrc(null));
          } catch (e) {
            if (!cancelled) setHistoryError(e.response?.data?.error || e.message || '创建会话失败');
          }
        } else {
          const latest = list[0];
          setActiveId(latest.id);
          setIframeSrc(buildEmbedSrc(latest.conversationId || null));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err.response?.status;
        const msg = status === 401
          ? '登录已过期，请重新登录'
          : (err.response?.data?.error || err.message || '加载历史对话失败');
        setHistoryError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRetry = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 监听 iframe 内 RAGFlow 通过 postMessage 传来的 conversationId，同步到当前会话记录
  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== RAGFLOW_ORIGIN) return;
      const data = event.data;
      const id = data?.conversationId ?? data?.conversation_id;
      if (typeof id !== 'string' || !id || !activeId) return;
      axios
        .patch(`/api/ai/conversations/${activeId}`, { conversationId: id }, { headers: getAuthHeaders() })
        .then(() => {
          setHistory((prev) => {
            const next = prev.map((h) => (h.id === activeId ? { ...h, conversationId: id } : h));
            saveCachedHistory(next);
            return next;
          });
        })
        .catch(() => {});
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [activeId]);

  const handleNewChat = useCallback(async () => {
    const title = `新对话 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    try {
      const res = await axios.post('/api/ai/conversations', { title }, { headers: getAuthHeaders() });
      const newItem = res.data;
      setHistory((prev) => {
        const next = [newItem, ...prev];
        saveCachedHistory(next);
        return next;
      });
      setIframeSrc(buildEmbedSrc(null));
      setActiveId(newItem.id);
    } catch (e) {
      console.warn('创建新对话失败', e);
      const msg = e.response?.data?.error || e.message || '创建失败';
      setHistoryError(msg);
    }
  }, []);

  const handleSelectHistory = useCallback((item) => {
    setActiveId(item.id);
    setIframeSrc(buildEmbedSrc(item.conversationId || null));
  }, []);

  const handleDeleteHistory = useCallback(
    async (e, item) => {
      e.stopPropagation();
      try {
        await axios.delete(`/api/ai/conversations/${item.id}`, { headers: getAuthHeaders() });
        setHistory((prev) => {
          const next = prev.filter((h) => h.id !== item.id);
          saveCachedHistory(next);
          if (activeId === item.id) {
            if (next.length > 0) {
              setActiveId(next[0].id);
              setIframeSrc(buildEmbedSrc(next[0].conversationId || null));
            } else {
              setActiveId(null);
              setIframeSrc(buildEmbedSrc());
            }
          }
          return next;
        });
      } catch (err) {
        console.warn('删除对话失败', err);
      }
    },
    [activeId]
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: tokens.bg,
        color: tokens.text,
      }}
    >
      {/* 顶栏：与侧栏同色、同边框，高度与间距统一 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 56,
          px: tokens.spacing,
          borderBottom: tokens.border,
          bgcolor: tokens.surface,
          flexShrink: 0,
        }}
      >
        <Button
          component={Link}
          to="/dashboard"
          startIcon={<ArrowBack sx={{ fontSize: 20 }} />}
          sx={{
            color: tokens.text,
            textTransform: 'none',
            fontSize: '0.9375rem',
            '&:hover': { bgcolor: tokens.surfaceHover },
          }}
        >
          返回
        </Button>
        <Typography
          variant="h6"
          sx={{
            flex: 1,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.125rem',
          }}
        >
          AI 助手
        </Typography>
        <Box sx={{ width: 72 }} />
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左侧边栏：与顶栏同 surface、同 border */}
        <Box
          sx={{
            width: 260,
            flexShrink: 0,
            borderRight: tokens.border,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: tokens.surface,
          }}
        >
          <Box sx={{ p: tokens.spacing }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddComment sx={{ fontSize: 20 }} />}
              onClick={handleNewChat}
              disabled={loading}
              sx={{
                justifyContent: 'flex-start',
                py: 1.25,
                color: tokens.text,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: tokens.radius,
                textTransform: 'none',
                fontSize: '0.9375rem',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.35)',
                  bgcolor: tokens.surfaceHover,
                },
              }}
            >
              新对话
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{
              px: tokens.spacing,
              py: 1,
              color: tokens.textSecondary,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            历史对话
          </Typography>
          <List
            dense
            disablePadding
            sx={{
              flex: 1,
              overflow: 'auto',
              px: tokens.spacing,
              pb: tokens.spacing,
            }}
          >
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} sx={{ color: tokens.textSecondary }} />
              </Box>
            )}
            {!loading && historyError && (
              <Box sx={{ px: tokens.spacing, py: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: '#f44336', fontSize: '0.8125rem', mb: 1 }}
                >
                  {historyError}
                </Typography>
                <Button
                  size="small"
                  onClick={historyError.includes('登录已过期') ? () => window.location.replace('/login') : handleRetry}
                  sx={{
                    color: tokens.text,
                    borderColor: 'rgba(255,255,255,0.3)',
                    fontSize: '0.75rem',
                    textTransform: 'none',
                  }}
                  variant="outlined"
                >
                  {historyError.includes('登录已过期') ? '去登录' : '重试'}
                </Button>
              </Box>
            )}
            {!loading && !historyError && history.length === 0 && (
              <Typography
                variant="body2"
                sx={{
                  px: tokens.spacing,
                  py: 2,
                  color: tokens.textSecondary,
                  fontSize: '0.8125rem',
                }}
              >
                暂无历史，点击「新对话」开始
              </Typography>
            )}
            {history.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeId === item.id}
                onClick={() => handleSelectHistory(item)}
                disableRipple
                sx={{
                  borderRadius: tokens.radius,
                  py: 1,
                  px: 1.5,
                  mb: 0.75,
                  '&.Mui-selected': {
                    bgcolor: tokens.surfaceSelected,
                    '&:hover': { bgcolor: tokens.surfaceSelected },
                  },
                  '&:hover': { bgcolor: tokens.surfaceHover },
                }}
              >
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: '0.875rem',
                    fontWeight: activeId === item.id ? 500 : 400,
                  }}
                />
                <Button
                  size="small"
                  onClick={(e) => handleDeleteHistory(e, item)}
                  sx={{
                    minWidth: 36,
                    minHeight: 36,
                    color: tokens.textSecondary,
                    '&:hover': { color: tokens.text, bgcolor: tokens.surfaceHover },
                  }}
                >
                  <DeleteOutline sx={{ fontSize: 18 }} />
                </Button>
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* 主区域：嵌入 iframe，与侧栏无缝衔接 */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: tokens.bg,
          }}
        >
          <Box
            component="iframe"
            src={iframeSrc}
            title="RAGFlow AI 助手"
            sx={{
              flex: 1,
              width: '100%',
              minHeight: 0,
              border: 'none',
              display: 'block',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
