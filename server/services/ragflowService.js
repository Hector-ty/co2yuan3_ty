// server/services/ragflowService.js
// RAGFlow 知识库 API 服务，用于报告导出中的 AI 内容生成
const axios = require('axios');

const RAGFLOW_API_URL = process.env.RAGFLOW_API_URL || '';
const RAGFLOW_DIALOG_ID = process.env.RAGFLOW_DIALOG_ID || '';
const RAGFLOW_API_KEY = process.env.RAGFLOW_API_KEY || '';
// 按名称指定知识库（如 co2yuan3），优先于 DIALOG_ID；需 RAGFlow API 支持按名称查询
const RAGFLOW_KB_NAME = process.env.RAGFLOW_KB_NAME || 'co2yuan3';
const RAGFLOW_KB_ID = process.env.RAGFLOW_KB_ID || '';

let _resolvedKbId = null;

/**
 * 检查 RAGFlow 是否已配置
 */
function isConfigured() {
  const hasBase = !!(RAGFLOW_API_URL && RAGFLOW_API_KEY);
  return hasBase && !!(RAGFLOW_DIALOG_ID || RAGFLOW_KB_ID || RAGFLOW_KB_NAME);
}

/**
 * 按名称解析知识库 ID（需 API Key 有 datasets 读权限）
 */
async function resolveKbIdByName() {
  if (_resolvedKbId) return _resolvedKbId;
  if (!RAGFLOW_API_URL || !RAGFLOW_API_KEY || !RAGFLOW_KB_NAME) return null;
  const baseUrl = RAGFLOW_API_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/datasets?name=${encodeURIComponent(RAGFLOW_KB_NAME)}&page=1&page_size=1`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${RAGFLOW_API_KEY}` },
      timeout: 10000,
    });
    const list = res?.data?.data;
    const id = Array.isArray(list) && list[0]?.id ? list[0].id : null;
    if (id) _resolvedKbId = id;
    return id;
  } catch {
    return null;
  }
}

/**
 * 获取当前应使用的知识库 ID（优先级：KB_ID > KB_NAME 解析 > 不用 kb 模式）
 */
async function getKbId() {
  if (RAGFLOW_KB_ID) return RAGFLOW_KB_ID;
  return resolveKbIdByName();
}

/**
 * 调用 searchbots/ask：按知识库 ID 进行 RAG 问答
 */
async function askByKbId(question, kbId, options = {}) {
  const baseUrl = RAGFLOW_API_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/searchbots/ask`;
  const timeout = options.timeout ?? 300000;

  const res = await axios.post(
    url,
    { question, kb_ids: [kbId] },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RAGFLOW_API_KEY}`,
      },
      timeout,
      responseType: 'stream',
      validateStatus: () => true,
    }
  );

  if (res.status !== 200) {
    const txt = res.data?.toString?.() || '';
    throw new Error(`searchbots/ask 请求失败: ${res.status} ${txt.slice(0, 200)}`);
  }

  let lastAnswer = '';
  const chunks = [];
  return new Promise((resolve, reject) => {
    res.data.on('data', (chunk) => chunks.push(chunk));
    res.data.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const lines = raw.split(/\n+/);
      for (const line of lines) {
        const m = line.match(/^data:\s*(.+)/);
        if (!m) continue;
        try {
          const obj = JSON.parse(m[1]);
          if (obj?.data === true) break;
          const a = obj?.data?.answer;
          if (typeof a === 'string') lastAnswer = a;
          if (obj?.code === 500) {
            reject(new Error(obj?.message || 'searchbots 返回错误'));
            return;
          }
        } catch {}
      }
      resolve({ answer: lastAnswer || '' });
    });
    res.data.on('error', reject);
  });
}

/**
 * 调用 chatbots completions
 */
async function chatByDialogId(question, options = {}) {
  const baseUrl = RAGFLOW_API_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/chatbots/${RAGFLOW_DIALOG_ID}/completions`;
  const timeout = options.timeout ?? 300000;

  const response = await axios.post(
    url,
    { question, stream: false },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RAGFLOW_API_KEY}`,
      },
      timeout,
      validateStatus: (status) => status >= 200 && status < 300,
    }
  );

  const body = response.data;
  if (body?.code !== 0 && body?.code !== undefined) {
    throw new Error(body?.message || 'RAGFlow API 返回错误');
  }
  const answer = body?.data?.answer;
  if (typeof answer !== 'string') {
    throw new Error('RAGFlow 返回的 answer 格式异常');
  }
  return { answer };
}

/**
 * 调用 RAGFlow 进行问答
 * 优先使用 co2yuan3 知识库：若配置了 RAGFLOW_KB_ID 或能按 RAGFLOW_KB_NAME 解析到 ID，则走 searchbots/ask
 * 否则使用 RAGFLOW_DIALOG_ID 的 chatbots 接口
 */
async function chatWithRAGFlow(question, options = {}) {
  if (!isConfigured()) {
    throw new Error('RAGFlow 未配置：请设置 RAGFLOW_API_URL、RAGFLOW_API_KEY，以及 RAGFLOW_DIALOG_ID 或 RAGFLOW_KB_ID/RAGFLOW_KB_NAME');
  }

  const kbId = await getKbId();
  if (kbId) {
    return askByKbId(question, kbId, options);
  }
  if (RAGFLOW_DIALOG_ID) {
    return chatByDialogId(question, options);
  }
  throw new Error('RAGFlow 未配置有效知识库：请设置 RAGFLOW_DIALOG_ID 或 RAGFLOW_KB_ID/RAGFLOW_KB_NAME');
}

module.exports = {
  isConfigured,
  chatWithRAGFlow,
};
