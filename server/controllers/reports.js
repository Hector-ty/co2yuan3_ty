const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const os = require('os');
const CarbonData = require('../models/CarbonData');
const Account = require('../models/Account');
const { formSections } = require('../utils/formFields'); // 导入前端表单字段定义
const { getRegionFullNameByCode } = require('../utils/regionData'); // 导入获取地区全名的方法
const ExcelJS = require('exceljs'); // 导入 exceljs 库
const { generateCarbonReportDocx, getTemplateBuffer } = require('../utils/carbonReportBuilder');
const PizZip = require('pizzip');
const ollamaService = require('../services/ollamaService');
const ragflowService = require('../services/ragflowService');
const { calculateEmissions } = require('../utils/calculationEngine');
const axios = require('axios');
const FormData = require('form-data');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

/** 延迟 ms 毫秒 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** 获取 soffice 可执行路径（优先用包装脚本 soffice 而非 soffice.bin，否则首次运行会退出码 81 且不重试） */
function getSofficePath() {
  const candidates = [
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/usr/lib/libreoffice/program/soffice',
    '/usr/lib/libreoffice/program/soffice.bin',
  ];
  for (const p of candidates) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      console.log('[PDF/soffice] 找到 soffice:', p);
      return p;
    } catch (e) {
      console.log('[PDF/soffice] 不可用:', p, e.code || e.message);
    }
  }
  console.warn('[PDF/soffice] 未找到 soffice，已尝试路径:', candidates.join(', '));
  return null;
}

/**
 * 本机 LibreOffice（soffice）将 DOCX 转为 PDF，用作 Gotenberg 500 时的回退
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>}
 */
async function docxToPdfBufferViaSoffice(docxBuffer) {
  console.log('[PDF/soffice] 开始本机 LibreOffice 回退转换，DOCX 大小:', docxBuffer.length);
  const soffice = getSofficePath();
  if (!soffice) {
    console.warn('[PDF/soffice] 回退中止：未找到 soffice');
    return null;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lo_'));
  const inputPath = path.join(tempDir, 'source.docx');
  console.log('[PDF/soffice] 临时目录:', tempDir);
  try {
    fs.writeFileSync(inputPath, docxBuffer);
    const written = fs.statSync(inputPath).size;
    console.log('[PDF/soffice] 已写入 source.docx，大小:', written);
    const fileUrl = pathToFileURL(inputPath).href;
    const env = {
      ...process.env,
      HOME: tempDir,
      TMPDIR: tempDir,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      SAL_USE_VCLPLUGIN: 'headless',
    };
    const runSoffice = (convArgs) => new Promise((resolve) => {
      execFile(soffice, convArgs, { cwd: tempDir, timeout: 120000, maxBuffer: 10 * 1024 * 1024, env }, (err, stdout, stderr) => {
        if (err) {
          resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: err.code ?? 1 });
        } else {
          resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: 0 });
        }
      });
    });
    let args = ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tempDir, fileUrl];
    console.log('[PDF/soffice] 执行:', soffice, args.join(' '));
    let stdout = '';
    let stderr = '';
    let exitCode = -1;
    let runCount = 0;
    while (runCount < 2) {
      runCount++;
      const out = await runSoffice(args);
      stdout = out.stdout;
      stderr = out.stderr;
      exitCode = out.exitCode;
      if (exitCode === 0) break;
      if (exitCode === 81 && runCount === 1 && soffice.endsWith('soffice.bin')) {
        console.warn('[PDF/soffice] 退出码 81（首次初始化），3 秒后重试…');
        await delay(3000);
        continue;
      }
      break;
    }
    const dirAfter = fs.readdirSync(tempDir);
    console.log('[PDF/soffice] soffice 退出码:', exitCode, '| 目录内容:', dirAfter.join(', '));
    if (exitCode !== 0) {
      if (stderr) console.error('[PDF/soffice] stderr:', String(stderr).trim().slice(0, 1000));
      else console.error('[PDF/soffice] stderr: (为空)');
      if (stdout) console.error('[PDF/soffice] stdout:', String(stdout).trim().slice(0, 500));
      else console.error('[PDF/soffice] stdout: (为空)');
    } else if (stderr || stdout) {
      if (stderr) console.log('[PDF/soffice] stderr:', String(stderr).trim().slice(0, 800));
      if (stdout) console.log('[PDF/soffice] stdout:', String(stdout).trim().slice(0, 500));
    }
    let pdfPath = path.join(tempDir, 'source.pdf');
    if (!fs.existsSync(pdfPath) && (stderr || '').includes('could not be loaded')) {
      console.warn('[PDF/soffice] file:// URL 方式失败，尝试相对路径…');
      const relArgs = ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', '.', 'source.docx'];
      console.log('[PDF/soffice] 执行（相对路径）:', soffice, relArgs.join(' '));
      const relOut = await runSoffice(relArgs);
      const relDir = fs.readdirSync(tempDir);
      console.log('[PDF/soffice] 相对路径退出码:', relOut.exitCode, '| 目录内容:', relDir.join(', '));
      if (relOut.exitCode === 0 && fs.existsSync(pdfPath)) {
        console.log('[PDF/soffice] 相对路径方式成功！');
      } else if ((relOut.stderr || '').includes('could not be loaded')) {
        console.warn('[PDF/soffice] 相对路径也失败，尝试两段式 DOCX→ODT→PDF…');
        const odtArgs = ['--headless', '--norestore', '--convert-to', 'odt', '--outdir', '.', 'source.docx'];
        console.log('[PDF/soffice] 第一步：DOCX→ODT，执行:', soffice, odtArgs.join(' '));
        const odtOut = await runSoffice(odtArgs);
        const odtPath = path.join(tempDir, 'source.odt');
        console.log('[PDF/soffice] DOCX→ODT 退出码:', odtOut.exitCode, '| stderr:', String(odtOut.stderr || '').trim().slice(0, 300));
        if (odtOut.exitCode === 0 && fs.existsSync(odtPath)) {
          const odtSize = fs.statSync(odtPath).size;
          console.log('[PDF/soffice] ODT 文件已生成，大小:', odtSize);
          if (odtSize > 0) {
            const pdfArgs = ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', '.', 'source.odt'];
            console.log('[PDF/soffice] 第二步：ODT→PDF，执行:', soffice, pdfArgs.join(' '));
            const pdfOut = await runSoffice(pdfArgs);
            console.log('[PDF/soffice] ODT→PDF 退出码:', pdfOut.exitCode, '| stderr:', String(pdfOut.stderr || '').trim().slice(0, 300));
            const dirAfterOdt = fs.readdirSync(tempDir);
            console.log('[PDF/soffice] 两段式转换后目录内容:', dirAfterOdt.join(', '));
            if (!pdfOut.exitCode && fs.existsSync(pdfPath)) {
              console.log('[PDF/soffice] 两段式转换成功！');
            } else {
              console.warn('[PDF/soffice] 两段式转换失败：ODT→PDF 未生成 source.pdf');
            }
          } else {
            console.warn('[PDF/soffice] ODT 文件大小为 0，跳过 ODT→PDF');
          }
        } else {
          console.warn('[PDF/soffice] DOCX→ODT 失败，无法继续两段式转换');
        }
      }
    }
    if (!fs.existsSync(pdfPath)) {
      console.warn('[PDF/soffice] 回退失败：未生成 source.pdf');
      return null;
    }
    const pdfSize = fs.statSync(pdfPath).size;
    if (pdfSize === 0) {
      console.warn('[PDF/soffice] 回退失败：source.pdf 大小为 0');
      return null;
    }
    console.log('[PDF/soffice] 回退成功，PDF 大小:', pdfSize);
    return fs.readFileSync(pdfPath);
  } catch (e) {
    console.error('[PDF/soffice] 回退异常:', e.message || e);
    if (e.stderr) console.error('[PDF/soffice] stderr:', String(e.stderr).slice(0, 1000));
    if (e.stdout) console.error('[PDF/soffice] stdout:', String(e.stdout).slice(0, 500));
    return null;
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (rmErr) {
      console.warn('[PDF/soffice] 清理临时目录失败:', rmErr.message);
    }
  }
}

/**
 * 向 Gotenberg 发起一次 DOCX→PDF 转换请求（用于首次调用与重试）
 */
async function postGotenbergConvert(baseUrl, docxBuffer) {
  const form = new FormData();
  form.append('files', docxBuffer, {
    filename: 'document.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = `${baseUrl}/forms/libreoffice/convert`;
  const response = await axios.post(url, form, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
    headers: form.getHeaders(),
  });
  const data = response.data;
  const isArrayBuffer = data && typeof data === 'object' && (data instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)));
  if (!data || !isArrayBuffer) {
    const ct = response.headers && response.headers['content-type'];
    const preview = typeof data === 'string' ? data.slice(0, 200) : (data ? String(data).slice(0, 200) : 'null');
    console.error('[Gotenberg] 响应非二进制: status=', response.status, 'content-type=', ct, 'dataType=', data == null ? 'null' : typeof data, 'preview=', preview);
    throw new Error('Gotenberg 未返回有效 PDF');
  }
  const pdfBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (pdfBuffer.length === 0) {
    throw new Error('Gotenberg 返回的 PDF 为空');
  }
  if (pdfBuffer.length < 8 || pdfBuffer[0] !== 0x25 || pdfBuffer[1] !== 0x50 || pdfBuffer[2] !== 0x44 || pdfBuffer[3] !== 0x46) {
    const preview = pdfBuffer.slice(0, 32).toString('utf8').replace(/[\x00-\x1f]/g, '.');
    console.error('[Gotenberg] 响应非 PDF 格式，前 32 字节:', preview);
    throw new Error('Gotenberg 返回的内容不是 PDF（可能是错误信息）');
  }
  return pdfBuffer;
}

/**
 * 通过 Gotenberg 将 DOCX Buffer 转为 PDF Buffer
 * 若首次返回 500，会等待数秒后自动重试一次（应对容器刚启动时 LibreOffice 未就绪）
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>}
 */
async function docxToPdfBuffer(docxBuffer) {
  const baseUrl = (process.env.GOTENBERG_URL || '').replace(/\/$/, '');
  if (!docxBuffer || !Buffer.isBuffer(docxBuffer) || docxBuffer.length < 4) {
    throw new Error('DOCX 内容无效，无法转换 PDF');
  }
  if (docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4b) {
    throw new Error('DOCX 内容无效（非 ZIP 格式），无法转换 PDF');
  }

  if (!baseUrl) {
    const fallback = await docxToPdfBufferViaSoffice(docxBuffer);
    if (fallback && fallback.length > 0) return fallback;
    throw new Error('未配置 GOTENBERG_URL 且本机无 LibreOffice，无法将 DOCX 转为 PDF。请设置 GOTENBERG_URL 或在 backend 中安装 LibreOffice。');
  }

  const GOTENBERG_WARMUP_RETRY_DELAY_MS = parseInt(process.env.GOTENBERG_WARMUP_RETRY_DELAY_MS || '8000', 10);
  if (process.env.DEBUG_REPORT_XML === '1') {
    console.log('[Gotenberg] 请求转换 DOCX 大小:', docxBuffer && docxBuffer.length);
  }

  try {
    try {
      return await postGotenbergConvert(baseUrl, docxBuffer);
    } catch (firstErr) {
      if (firstErr.response && firstErr.response.status === 500) {
        console.warn('[Gotenberg] 首次转换返回 500，可能是 LibreOffice 未就绪，', GOTENBERG_WARMUP_RETRY_DELAY_MS / 1000, '秒后重试一次…');
        await delay(GOTENBERG_WARMUP_RETRY_DELAY_MS);
        return await postGotenbergConvert(baseUrl, docxBuffer);
      }
      throw firstErr;
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('无法连接 Gotenberg 服务（' + baseUrl + '），请确认 Gotenberg 已启动且 GOTENBERG_URL 配置正确。');
    }
    if (err.response && err.response.status === 500) {
      const rawBody500 = err.response.data;
      const bodyStr500 = !rawBody500 ? '' : (Buffer.isBuffer(rawBody500) ? rawBody500.toString('utf8') : String(rawBody500));
      if (bodyStr500) console.error('[Gotenberg] HTTP 500 body:', bodyStr500);
      console.warn('[Gotenberg] Gotenberg 返回 500，尝试本机 LibreOffice 回退…');
      const fallback = await docxToPdfBufferViaSoffice(docxBuffer);
      if (fallback && fallback.length > 0) {
        console.warn('[Gotenberg] 本机 LibreOffice 回退转换成功。');
        return fallback;
      }
      console.error('[Gotenberg] 本机 LibreOffice 回退不可用或转换失败，见上方 [PDF/soffice] 日志。');
      const templateBuf = getTemplateBuffer && getTemplateBuffer();
      if (templateBuf && templateBuf.length > 0) {
        console.log('[Gotenberg] 诊断：尝试转换原始模板 templete.docx（未填充数据）…');
        const templatePdf = await docxToPdfBufferViaSoffice(templateBuf);
        if (templatePdf && templatePdf.length > 0) {
          console.error('[Gotenberg] 诊断结果：原始模板可转换，问题在「报告生成内容」。请检查 carbonReportBuilder 或模板占位符导致的内容。');
        } else {
          console.error('[Gotenberg] 诊断结果：原始模板也无法转换，问题在「模板文件（Windows 编辑）或 LibreOffice 环境」。建议：在 Linux 或 LibreOffice 中重新另存模板，或本机导出 DOCX 后手动转 PDF。');
        }
      }
      if (docxBuffer && docxBuffer.length > 0) {
        const debugPath = path.join(os.tmpdir(), 'co2yuan_report_failed.docx');
        try {
          fs.writeFileSync(debugPath, docxBuffer);
          console.error('[Gotenberg] 失败 DOCX 大小:', docxBuffer.length, '已保存到', debugPath);
          try {
            const zip = new PizZip(docxBuffer);
            const docXml = zip.files['word/document.xml'];
            if (docXml) {
              const xmlPath = path.join(os.tmpdir(), 'co2yuan_report_failed_document.xml');
              let xmlText = '';
              if (docXml.asNodeBuffer) {
                const buf = docXml.asNodeBuffer();
                xmlText = Buffer.isBuffer(buf) ? buf.toString('utf8') : (docXml.asText ? docXml.asText() : '');
              }
              if (!xmlText && docXml.asText) xmlText = docXml.asText();
              if (xmlText) {
                fs.writeFileSync(xmlPath, xmlText, 'utf8');
                const hasBad = /\uFFFD/.test(xmlText);
                const tblMismatch = (xmlText.match(/<w:tbl\b/g) || []).length !== (xmlText.match(/<\/w:tbl>/g) || []).length || (xmlText.match(/<w:trPr\b/g) || []).length !== (xmlText.match(/<\/w:trPr>/g) || []).length;
                console.error('[Gotenberg] 已导出 word/document.xml 长度:', xmlText.length, '路径:', xmlPath, hasBad ? '| 内容含 U+FFFD 替换符，疑似编码问题' : '', tblMismatch ? '| tbl/trPr 标签数量不一致，疑似 F.3.2 表格替换导致' : '');
              }
            }
          } catch (zipErr) {
            console.warn('[Gotenberg] 导出 document.xml 失败:', zipErr.message);
          }
        } catch (e) {
          console.warn('[Gotenberg] 保存失败 DOCX 到', debugPath, '失败:', e && e.message);
        }
      }
      throw new Error('Gotenberg 转换失败（HTTP 500），且本机 LibreOffice 回退不可用。请先导出 DOCX 格式，在本机用 Word 或 LibreOffice 打开后另存为 PDF。');
    }
    if (err.response && err.response.status) {
      const status = err.response.status;
      const rawBody = err.response.data;
      const bodyStr = !rawBody ? '' : (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
      const bodyPreview = bodyStr.trim().slice(0, 500);
      if (bodyStr) console.error('[Gotenberg] HTTP', status, 'body:', bodyStr);
      throw new Error('Gotenberg 转换失败（HTTP ' + status + '）' + (bodyPreview ? ': ' + bodyPreview : '。请先导出 DOCX 后在本机用 Word 或 LibreOffice 另存为 PDF。'));
    }
    throw new Error((err.message || 'DOCX 转 PDF 失败') + '。请先导出 DOCX 后在本机用 Word 或 LibreOffice 另存为 PDF。');
  }
}

// 导出报告下载 token 临时存储，5 分钟后过期
const REPORT_DOWNLOAD_TTL_MS = 5 * 60 * 1000;
const reportDownloadStore = new Map();

function cleanupReportDownloadStore() {
  const now = Date.now();
  for (const [token, entry] of reportDownloadStore.entries()) {
    if (now - entry.createdAt > REPORT_DOWNLOAD_TTL_MS) reportDownloadStore.delete(token);
  }
}

// 批量导出任务：jobId -> { userId, userContext, format, recordIds, total, completed, results, status, createdAt }
const BATCH_JOB_TTL_MS = 30 * 60 * 1000;
const MAX_BATCH_SIZE = 30;
const batchJobs = new Map();

function cleanupBatchJobs() {
  const now = Date.now();
  for (const [jobId, job] of batchJobs.entries()) {
    if (now - job.createdAt > BATCH_JOB_TTL_MS) batchJobs.delete(jobId);
  }
}

/** 检查当前用户是否有权导出该条碳数据 */
function canExportRecord(record, userContext) {
  const accountId = (record.account && record.account.toString) ? record.account.toString() : String(record.account || '');
  const userId = (userContext._id && userContext._id.toString) ? userContext._id.toString() : String(userContext._id || '');
  const role = userContext.role;
  if (role === 'organization_user') {
    return accountId === userId;
  }
  if (role === 'superadmin') return true;
  const rc = userContext.region && String(userContext.region);
  if (!rc) return true;
  if (role === 'province_admin') return new RegExp(`^${rc.substring(0, 2)}`).test(record.regionCode);
  if (role === 'city_admin') return new RegExp(`^${rc.substring(0, 4)}`).test(record.regionCode);
  if (role === 'district_admin') return record.regionCode === rc;
  return false;
}

/**
 * 为单条记录生成报告 buffer（供单次导出与批量导出复用）
 * @returns {{ buffer, contentType, filename, institutionName }}
 */
async function generateOneReportBuffer(recordId, format, userContext) {
  const record = await CarbonData.findById(recordId).lean();
  if (!record) throw new Error('未找到该条数据');

  if (!canExportRecord(record, userContext)) {
    throw new Error('无权导出该条数据');
  }

  const accountId = (record.account && record.account.toString) ? record.account.toString() : String(record.account || '');
  const account = await Account.findById(accountId).lean();
  if (!account) throw new Error('未找到机构信息');

  const regionCode = record.regionCode;
  const historical = await CarbonData.find({
    account: accountId,
    regionCode,
    year: { $in: [2022, 2023, 2024] }
  }).lean();
  const historicalByYear = {};
  historical.forEach((h) => { historicalByYear[h.year] = h; });

  const userMsg = (p) => `请为《公共机构碳排放核算报告》撰写以下部分的内容。

要求：直接输出要填入报告的文字，不要输出"您好"、"看起来您输入"等问候语或元说明，不要输出代码，只需输出报告正文段落。

请撰写：${p}`;

  const callAI = async (prompt) => {
    const msg = userMsg(prompt);
    const postProcess = (text) => {
      if (/看起来您输入的|我不确定它具体指的是什么|如果您能提供更多上下文|是一段代码或指令/.test(text)) {
        return '（本节内容请根据机构碳排放管理实际情况填写）';
      }
      const trimPatterns = [
        /^您好[，,]?\s*/i,
        /^看起来您输入的[^。]*。\s*/i,
        /^如果您[^。]*[。，,]\s*/i,
        /^我[很非常]乐意[^。]*[。，,]\s*/i,
      ];
      for (const re of trimPatterns) {
        text = text.replace(re, '');
      }
      return text.trim() || '（本节内容请根据机构碳排放管理实际情况填写）';
    };
    const onError = (err, source) => {
      console.warn(`AI 生成失败 (${source})，使用占位文本:`, err.message);
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message);
      return isTimeout
        ? '（AI 生成超时，请稍后重试或减少模板中的 AI 占位符数量）'
        : `（AI 生成内容暂不可用：${err.message}）`;
    };
    try {
      if (ragflowService.isConfigured()) {
        try {
          const { answer } = await ragflowService.chatWithRAGFlow(msg, { timeout: 300000 });
          return postProcess(answer || '');
        } catch (ragErr) {
          console.warn('RAGFlow 调用失败，回退到 Ollama:', ragErr.message);
        }
      }
      const response = await ollamaService.chatWithOllama(
        [{ role: 'user', content: msg }],
        { timeout: 300000 }
      );
      const content = response?.message?.content;
      const text = typeof content === 'string' ? content : (content || '');
      return postProcess(text);
    } catch (err) {
      return onError(err, ragflowService.isConfigured() ? 'RAGFlow/Ollama' : 'Ollama');
    }
  };

  const activityData = record.activityData || {};
  const calculatedEmissions = await calculateEmissions(activityData);
  const recordWithCalc = { ...record, calculatedEmissions };

  const docxBuffer = await generateCarbonReportDocx(recordWithCalc, account, historicalByYear, callAI);

  const fmt = (format || 'docx').toLowerCase();
  const unitName = (account.unitName || '报告').replace(/[/\\?%*:|"<>]/g, '_');
  const year = record.year || '';
  const baseFilename = `碳排放报告_${unitName}_${year}年度`;
  let finalBuffer = docxBuffer;
  let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8';
  let filename = baseFilename + '.docx';

  if (fmt === 'pdf') {
    try {
      finalBuffer = await docxToPdfBuffer(docxBuffer);
      contentType = 'application/pdf; charset=utf-8';
      filename = baseFilename + '.pdf';
    } catch (pdfErr) {
      console.error('PDF 转换失败:', pdfErr.message);
      throw new Error(pdfErr.message || 'PDF 导出需要 Gotenberg 服务，请使用 docx 格式或联系管理员配置 GOTENBERG_URL。');
    }
  }

  return {
    buffer: finalBuffer,
    contentType,
    filename,
    institutionName: account.unitName || account.name || '未知机构',
  };
}

async function processBatchJob(jobId) {
  const job = batchJobs.get(jobId);
  if (!job || job.status !== 'running') return;

  const userContext = job.userContext;
  for (let i = 0; i < job.recordIds.length; i++) {
    if (job.status !== 'running') break;
    const recordId = job.recordIds[i];
    job.results[i].status = 'processing';
    try {
      const record = await CarbonData.findById(recordId).lean().select('account');
      if (record) {
        const accountId = (record.account && record.account.toString) ? record.account.toString() : String(record.account || '');
        const account = await Account.findById(accountId).lean().select('unitName name');
        if (account) {
          job.results[i].institutionName = account.unitName || account.name || '未知机构';
        }
      }
    } catch (_) {}
    try {
      const x = await generateOneReportBuffer(recordId, job.format, userContext);
      const token = crypto.randomBytes(16).toString('hex');
      reportDownloadStore.set(token, {
        buffer: x.buffer,
        contentType: x.contentType,
        filename: x.filename,
        createdAt: Date.now(),
      });
      job.results[i] = {
        ...job.results[i],
        status: 'done',
        downloadToken: token,
        filename: x.filename,
        institutionName: x.institutionName,
      };
    } catch (err) {
      job.results[i] = {
        ...job.results[i],
        status: 'error',
        error: err.message || '生成失败',
      };
    }
    job.completed = i + 1;
  }
  job.status = 'completed';
  cleanupReportDownloadStore();
}

// A simple utility to convert a flat JSON object to a CSV row
function jsonToCsv(items) {
  if (!items || items.length === 0) {
    return ''; // Return empty string if no items
  }
  const header = Object.keys(items[0]);
  const headerString = header.join(',');

  // Build the CSV string
  const replacer = (key, value) => value === null || value === undefined ? '' : value;
  const rowItems = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
  
  return [headerString, ...rowItems].join('\r\n');
}

// Helper to get nested value safely
const getNestedValue = (obj, path) => {
  return path.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
};

// Helper to flatten activity data based on formSections
const flattenActivityData = (activityData) => {
  const flat = {};
  formSections.forEach(section => {
    const processFields = (fields) => {
      fields.forEach(field => {
        const fieldPath = field.name; // e.g., ['fossilFuels', 'solid', 'anthracite']
        const flatKey = fieldPath.join('_'); // e.g., 'fossilFuels_solid_anthracite'
        flat[flatKey] = getNestedValue(activityData, fieldPath) || '';
      });
    };

    if (section.panels) {
      section.panels.forEach(panel => processFields(panel.fields));
    } else {
      processFields(section.fields);
    }
  });
  return flat;
};

// @desc    Export user data to CSV
// @route   GET /api/reports/csv
// @access  Private
exports.exportCsv = async (req, res, next) => {
  try {
    const data = await CarbonData.find({ account: req.user.id }).lean();

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found to export' });
    }

    // We need to flatten the complex data structure for CSV export
    const flattenedData = data.map(entry => {
      const activityFlat = flattenActivityData(entry.activityData); // Flatten all activity data

      return {
        year: entry.year,
        regionCode: entry.regionCode,
        regionName: getRegionFullNameByCode(entry.regionCode) || entry.regionCode, // 添加地区全名
        ...activityFlat, // 展开所有活动数据字段
        // Calculated Emissions
        totalEmissions_tCO2: entry.calculatedEmissions?.totalEmissions || 0,
        totalDirect_tCO2: entry.calculatedEmissions?.totalDirect || 0,
        totalIndirect_tCO2: entry.calculatedEmissions?.totalIndirect || 0,
        intensityByArea_tCO2_per_m2: entry.calculatedEmissions?.emissionIntensityByArea || 0,
        intensityByPerson_tCO2_per_person: entry.calculatedEmissions?.emissionIntensityByPerson || 0,
        // Breakdown
        breakdown_fossilFuels_tCO2: entry.calculatedEmissions?.breakdown?.fossilFuels || 0,
        breakdown_electricity_tCO2: entry.calculatedEmissions?.breakdown?.electricity || 0,
        breakdown_heat_tCO2: entry.calculatedEmissions?.breakdown?.heat || 0,
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : ''
      };
    });

    const csv = jsonToCsv(flattenedData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_report_${req.user.id}.csv`);
    res.send(csv);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 定义每个sheet的中文表头和对应的字段映射
const sheetConfigs = {
  '直接排放(化石燃料燃烧)': {
    sectionName: 'fossilFuels',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'fossilFuels_solid_anthracite': '化石燃料-固体-无烟煤 (吨)',
      'fossilFuels_solid_bituminous': '化石燃料-固体-烟煤 (吨)',
      'fossilFuels_solid_lignite': '化石燃料-固体-褐煤 (吨)',
      'fossilFuels_liquid_gasoline': '化石燃料-液体-汽油 (吨)',
      'fossilFuels_liquid_diesel': '化石燃料-液体-柴油 (吨)',
      'fossilFuels_liquid_kerosene': '化石燃料-液体-煤油 (吨)',
      'fossilFuels_gas_naturalGas': '化石燃料-气体-天然气 (万立方米)',
      'fossilFuels_gas_LPG': '化石燃料-气体-液化石油气 (吨)',
      'breakdown_fossilFuels_tCO2': '化石燃料排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName',
      'fossilFuels_solid_anthracite', 'fossilFuels_solid_bituminous', 'fossilFuels_solid_lignite',
      'fossilFuels_liquid_gasoline', 'fossilFuels_liquid_diesel', 'fossilFuels_liquid_kerosene',
      'fossilFuels_gas_naturalGas', 'fossilFuels_gas_LPG',
      'breakdown_fossilFuels_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  },
  '直接排放(移动源)': {
    sectionName: 'mobileSources',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'mobileSources_road_passengerCars_gasoline': '移动源-道路-乘用车-汽油 (辆)',
      'mobileSources_road_passengerCars_diesel': '移动源-道路-乘用车-柴油 (辆)',
      'mobileSources_road_buses_diesel': '移动源-道路-公共汽车-柴油 (辆)',
      'mobileSources_road_trucks_diesel': '移动源-道路-货车-柴油 (辆)',
      'mobileSources_rail_dieselLocomotives': '移动源-铁路-内燃机车-柴油 (辆)',
      'mobileSources_aviation_jetFuel': '移动源-航空-航空煤油 (吨)',
      'mobileSources_shipping_diesel': '移动源-水运-柴油 (吨)',
      'breakdown_mobileSources_tCO2': '移动源排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName',
      'mobileSources_road_passengerCars_gasoline', 'mobileSources_road_passengerCars_diesel',
      'mobileSources_road_buses_diesel', 'mobileSources_road_trucks_diesel',
      'mobileSources_rail_dieselLocomotives', 'mobileSources_aviation_jetFuel',
      'mobileSources_shipping_diesel', 'breakdown_mobileSources_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  },
  '外购电力': {
    sectionName: 'purchasedElectricity',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'purchasedElectricity_consumption': '外购电力-消费量 (万千瓦时)',
      'breakdown_electricity_tCO2': '外购电力排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName', 'purchasedElectricity_consumption',
      'breakdown_electricity_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  },
  '外购热力': {
    sectionName: 'purchasedHeat',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'purchasedHeat_consumption': '外购热力-消费量 (GJ)',
      'breakdown_heat_tCO2': '外购热力排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName', 'purchasedHeat_consumption',
      'breakdown_heat_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  }
};

// @desc    Export user data to Excel with multiple sheets
// @route   GET /api/reports/excel
// @access  Private
exports.exportExcel = async (req, res, next) => {
  try {
    const data = await CarbonData.find({ account: req.user.id }).lean();

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found to export' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Carbon Emission Monitoring System';
    workbook.lastModifiedBy = 'Carbon Emission Monitoring System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Prepare flattened data for all entries
    const allFlattenedData = data.map(entry => {
      const activityFlat = flattenActivityData(entry.activityData);
      return {
        year: entry.year,
        regionCode: entry.regionCode,
        regionName: getRegionFullNameByCode(entry.regionCode) || entry.regionCode,
        ...activityFlat,
        totalEmissions_tCO2: entry.calculatedEmissions?.totalEmissions || 0,
        totalDirect_tCO2: entry.calculatedEmissions?.totalDirect || 0,
        totalIndirect_tCO2: entry.calculatedEmissions?.totalIndirect || 0,
        intensityByArea_tCO2_per_m2: entry.calculatedEmissions?.emissionIntensityByArea || 0,
        intensityByPerson_tCO2_per_person: entry.calculatedEmissions?.emissionIntensityByPerson || 0,
        breakdown_fossilFuels_tCO2: entry.calculatedEmissions?.breakdown?.fossilFuels || 0,
        breakdown_mobileSources_tCO2: entry.calculatedEmissions?.breakdown?.mobileSources || 0, // Added mobile sources breakdown
        breakdown_electricity_tCO2: entry.calculatedEmissions?.breakdown?.electricity || 0,
        breakdown_heat_tCO2: entry.calculatedEmissions?.breakdown?.heat || 0,
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : ''
      };
    });

    for (const sheetName in sheetConfigs) {
      const config = sheetConfigs[sheetName];
      const worksheet = workbook.addWorksheet(sheetName);

      // Set columns with Chinese headers
      worksheet.columns = config.fields.map(field => ({
        header: config.headers[field] || field, // Use Chinese header if defined, otherwise use field name
        key: field,
        width: 20
      }));

      // Filter and add rows based on sectionName
      const sheetData = allFlattenedData.filter(entry => {
        // Check if the entry has any data relevant to this section
        // This is a simplified check; a more robust check might iterate through config.fields
        const relevantFields = config.fields.filter(f => !['year', 'regionName', 'totalEmissions_tCO2', 'createdAt'].includes(f));
        return relevantFields.some(field => entry[field] !== '' && entry[field] !== 0);
      });

      worksheet.addRows(sheetData);
    }

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`carbon_report_${req.user.id}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Export single carbon data as carbon emission report (docx/pdf)
// @route   GET /api/reports/carbon-report?id=xxx&format=docx|pdf
// @access  Private
exports.exportCarbonReport = async (req, res, next) => {
  try {
    const { id, format } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: '缺少参数 id' });
    }

    const record = await CarbonData.findById(id).lean();
    if (!record) {
      return res.status(404).json({ success: false, error: '未找到该条数据' });
    }

    const accountId = (record.account && record.account.toString) ? record.account.toString() : String(record.account || '');
    const userId = (req.user._id && req.user._id.toString) ? req.user._id.toString() : String(req.user.id || '');
    const role = req.user.role;

    if (role === 'organization_user') {
      if (accountId !== userId) return res.status(403).json({ success: false, error: '无权导出该条数据' });
    } else if (role !== 'superadmin') {
      const rc = req.user.region && String(req.user.region);
      if (rc) {
        let ok = false;
        if (role === 'province_admin') ok = new RegExp(`^${rc.substring(0, 2)}`).test(record.regionCode);
        else if (role === 'city_admin') ok = new RegExp(`^${rc.substring(0, 4)}`).test(record.regionCode);
        else if (role === 'district_admin') ok = record.regionCode === rc;
        if (!ok) return res.status(403).json({ success: false, error: '无权导出该条数据' });
      }
    }

    const account = await Account.findById(accountId).lean();
    if (!account) {
      return res.status(404).json({ success: false, error: '未找到机构信息' });
    }

    const regionCode = record.regionCode;
    const historical = await CarbonData.find({
      account: accountId,
      regionCode,
      year: { $in: [2022, 2023, 2024] }
    }).lean();
    const historicalByYear = {};
    historical.forEach((h) => { historicalByYear[h.year] = h; });

    const userMsg = (p) => `请为《公共机构碳排放核算报告》撰写以下部分的内容。

要求：直接输出要填入报告的文字，不要输出"您好"、"看起来您输入"等问候语或元说明，不要输出代码，只需输出报告正文段落。

请撰写：${p}`;

    const callAI = async (prompt) => {
      const msg = userMsg(prompt);

      const postProcess = (text) => {
        // 检测“拒答”式通用回复，替换为占位提示
        if (/看起来您输入的|我不确定它具体指的是什么|如果您能提供更多上下文|是一段代码或指令/.test(text)) {
          return '（本节内容请根据机构碳排放管理实际情况填写）';
        }
        // 去除常见的无关开头
        const trimPatterns = [
          /^您好[，,]?\s*/i,
          /^看起来您输入的[^。]*。\s*/i,
          /^如果您[^。]*[。，,]\s*/i,
          /^我[很非常]乐意[^。]*[。，,]\s*/i,
        ];
        for (const re of trimPatterns) {
          text = text.replace(re, '');
        }
        return text.trim() || '（本节内容请根据机构碳排放管理实际情况填写）';
      };

      const onError = (err, source) => {
        console.warn(`AI 生成失败 (${source})，使用占位文本:`, err.message);
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message);
        return isTimeout
          ? '（AI 生成超时，请稍后重试或减少模板中的 AI 占位符数量）'
          : `（AI 生成内容暂不可用：${err.message}）`;
      };

      try {
        // 优先使用 RAGFlow 知识库（若已配置）
        if (ragflowService.isConfigured()) {
          try {
            const { answer } = await ragflowService.chatWithRAGFlow(msg, { timeout: 300000 });
            return postProcess(answer || '');
          } catch (ragErr) {
            console.warn('RAGFlow 调用失败，回退到 Ollama:', ragErr.message);
          }
        }

        // 回退到 Ollama
        const response = await ollamaService.chatWithOllama(
          [{ role: 'user', content: msg }],
          { timeout: 300000 }
        );
        const content = response?.message?.content;
        const text = typeof content === 'string' ? content : (content || '');
        return postProcess(text);
      } catch (err) {
        return onError(err, ragflowService.isConfigured() ? 'RAGFlow/Ollama' : 'Ollama');
      }
    };

    // 导出前重新计算排放，确保 calculatedEmissions.detailedBreakdown 完整（供 F.3.2 表格使用）
    const activityData = record.activityData || {};
    const calculatedEmissions = await calculateEmissions(activityData);
    const recordWithCalc = { ...record, calculatedEmissions };

    const docxBuffer = await generateCarbonReportDocx(recordWithCalc, account, historicalByYear, callAI);

    const fmt = (format || 'docx').toLowerCase();
    const unitName = (account.unitName || '报告').replace(/[/\\?%*:|"<>]/g, '_');
    const year = record.year || '';
    const filename = `碳排放报告_${unitName}_${year}年度`;

    if (fmt === 'pdf') {
      try {
        const pdfBuffer = await docxToPdfBuffer(docxBuffer);
        res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename + '.pdf')}`);
        res.send(pdfBuffer);
      } catch (pdfErr) {
        console.error('PDF 转换失败:', pdfErr.message);
        res.status(503).json({
          success: false,
          error: pdfErr.message || 'PDF 导出需要 Gotenberg 服务。请使用 docx 格式导出，或联系管理员配置 GOTENBERG_URL。'
        });
      }
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename + '.docx')}`);
      res.send(docxBuffer);
    }
  } catch (error) {
    console.error('导出碳排放报告失败:', error);
    next(error);
  }
};

/**
 * 发送 SSE 事件
 */
function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// @desc    Export carbon report with real-time progress (SSE)
// @route   GET /api/reports/carbon-report-stream?id=xxx&format=docx|pdf
// @access  Private
exports.exportCarbonReportStream = async (req, res, next) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
  res.flushHeaders && res.flushHeaders();

  try {
    const { id, format } = req.query;
    if (!id) {
      sendSSE(res, 'error', { error: '缺少参数 id' });
      return res.end();
    }

    sendSSE(res, 'progress', { progress: 5, message: '正在加载数据…' });

    const record = await CarbonData.findById(id).lean();
    if (!record) {
      sendSSE(res, 'error', { error: '未找到该条数据' });
      return res.end();
    }

    const accountId = (record.account && record.account.toString) ? record.account.toString() : String(record.account || '');
    const userId = (req.user._id && req.user._id.toString) ? req.user._id.toString() : String(req.user.id || '');
    const role = req.user.role;

    if (role === 'organization_user') {
      if (accountId !== userId) {
        sendSSE(res, 'error', { error: '无权导出该条数据' });
        return res.end();
      }
    } else if (role !== 'superadmin') {
      const rc = req.user.region && String(req.user.region);
      if (rc) {
        let ok = false;
        if (role === 'province_admin') ok = new RegExp(`^${rc.substring(0, 2)}`).test(record.regionCode);
        else if (role === 'city_admin') ok = new RegExp(`^${rc.substring(0, 4)}`).test(record.regionCode);
        else if (role === 'district_admin') ok = record.regionCode === rc;
        if (!ok) {
          sendSSE(res, 'error', { error: '无权导出该条数据' });
          return res.end();
        }
      }
    }

    const account = await Account.findById(accountId).lean();
    if (!account) {
      sendSSE(res, 'error', { error: '未找到机构信息' });
      return res.end();
    }

    const regionCode = record.regionCode;
    const historical = await CarbonData.find({
      account: accountId,
      regionCode,
      year: { $in: [2022, 2023, 2024] }
    }).lean();
    const historicalByYear = {};
    historical.forEach((h) => { historicalByYear[h.year] = h; });

    const userMsg = (p) => `请为《公共机构碳排放核算报告》撰写以下部分的内容。

要求：直接输出要填入报告的文字，不要输出"您好"、"看起来您输入"等问候语或元说明，不要输出代码，只需输出报告正文段落。

请撰写：${p}`;

    const callAI = async (prompt) => {
      const msg = userMsg(prompt);
      const postProcess = (text) => {
        if (/看起来您输入的|我不确定它具体指的是什么|如果您能提供更多上下文|是一段代码或指令/.test(text)) {
          return '（本节内容请根据机构碳排放管理实际情况填写）';
        }
        const trimPatterns = [
          /^您好[，,]?\s*/i,
          /^看起来您输入的[^。]*。\s*/i,
          /^如果您[^。]*[。，,]\s*/i,
          /^我[很非常]乐意[^。]*[。，,]\s*/i,
        ];
        for (const re of trimPatterns) {
          text = text.replace(re, '');
        }
        return text.trim() || '（本节内容请根据机构碳排放管理实际情况填写）';
      };
      const onError = (err, source) => {
        console.warn(`AI 生成失败 (${source})，使用占位文本:`, err.message);
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message);
        return isTimeout
          ? '（AI 生成超时，请稍后重试或减少模板中的 AI 占位符数量）'
          : `（AI 生成内容暂不可用：${err.message}）`;
      };
      try {
        if (ragflowService.isConfigured()) {
          try {
            const { answer } = await ragflowService.chatWithRAGFlow(msg, { timeout: 300000 });
            return postProcess(answer || '');
          } catch (ragErr) {
            console.warn('RAGFlow 调用失败，回退到 Ollama:', ragErr.message);
          }
        }
        const response = await ollamaService.chatWithOllama(
          [{ role: 'user', content: msg }],
          { timeout: 300000 }
        );
        const content = response?.message?.content;
        const text = typeof content === 'string' ? content : (content || '');
        return postProcess(text);
      } catch (err) {
        return onError(err, ragflowService.isConfigured() ? 'RAGFlow/Ollama' : 'Ollama');
      }
    };

    sendSSE(res, 'progress', { progress: 10, message: '正在计算排放量…' });
    const activityData = record.activityData || {};
    const calculatedEmissions = await calculateEmissions(activityData);
    const recordWithCalc = { ...record, calculatedEmissions };

    const onProgress = (pct, message) => {
      const progress = Math.min(100, Math.round(10 + (pct / 100) * 75));
      sendSSE(res, 'progress', { progress, message });
    };

    const docxBuffer = await generateCarbonReportDocx(recordWithCalc, account, historicalByYear, callAI, onProgress);

    const fmt = (format || 'docx').toLowerCase();
    const unitName = (account.unitName || '报告').replace(/[/\\?%*:|"<>]/g, '_');
    const year = record.year || '';
    const baseFilename = `碳排放报告_${unitName}_${year}年度`;

    let finalBuffer = docxBuffer;
    let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8';
    let filename = baseFilename + '.docx';

    if (fmt === 'pdf') {
      sendSSE(res, 'progress', { progress: 90, message: '正在转换为 PDF…' });
      try {
        finalBuffer = await docxToPdfBuffer(docxBuffer);
        contentType = 'application/pdf; charset=utf-8';
        filename = baseFilename + '.pdf';
      } catch (pdfErr) {
        console.error('PDF 转换失败:', pdfErr.message);
        sendSSE(res, 'error', {
          error: pdfErr.message || 'PDF 导出需要 Gotenberg 服务。请使用 docx 格式导出，或联系管理员配置 GOTENBERG_URL。'
        });
        return res.end();
      }
    }

    const token = crypto.randomBytes(16).toString('hex');
    reportDownloadStore.set(token, {
      buffer: finalBuffer,
      contentType,
      filename,
      createdAt: Date.now(),
    });
    cleanupReportDownloadStore();

    sendSSE(res, 'done', { downloadToken: token, filename });
    res.end();
  } catch (error) {
    console.error('导出碳排放报告流失败:', error);
    sendSSE(res, 'error', { error: error.message || '服务器错误' });
    res.end();
  }
};

// @desc    Download carbon report by token (after SSE stream done)
// @route   GET /api/reports/carbon-report-download?token=xxx
// @access  Private
exports.downloadCarbonReport = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: '缺少参数 token' });
    }
    cleanupReportDownloadStore();
    const entry = reportDownloadStore.get(token);
    if (!entry) {
      return res.status(404).json({ success: false, error: '下载链接已过期，请重新导出' });
    }
    reportDownloadStore.delete(token);
    res.setHeader('Content-Type', entry.contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(entry.filename)}`);
    res.send(entry.buffer);
  } catch (error) {
    console.error('下载报告失败:', error);
    next(error);
  }
};

// @desc    Create batch carbon report export job
// @route   POST /api/reports/carbon-report-batch
// @body    { recordIds: string[] } 或 { regionCode: string, year: number }（当前区县+年份全部）
// @body    format: 'docx' | 'pdf'
// @access  Private
exports.createBatchExport = async (req, res, next) => {
  try {
    cleanupBatchJobs();
    const userId = (req.user._id && req.user._id.toString) ? req.user._id.toString() : String(req.user.id || '');
    const userContext = {
      _id: userId,
      role: req.user.role,
      region: req.user.region ? String(req.user.region) : undefined,
    };

    let recordIds = Array.isArray(req.body.recordIds) ? req.body.recordIds : [];
    if (recordIds.length === 0 && req.body.regionCode != null && req.body.year != null) {
      const { regionCode, year } = req.body;
      const list = await CarbonData.find({
        regionCode: String(regionCode),
        year: Number(year),
      })
        .lean()
        .select('_id');
      recordIds = list.map((d) => (d._id && d._id.toString) ? d._id.toString() : String(d._id));
    }

    if (recordIds.length === 0) {
      return res.status(400).json({ success: false, error: '请提供 recordIds 或 regionCode+year' });
    }
    if (recordIds.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        success: false,
        error: `单次最多导出 ${MAX_BATCH_SIZE} 个机构，当前 ${recordIds.length} 个`,
      });
    }

    const format = (req.body.format || 'docx').toLowerCase();
    if (format !== 'docx' && format !== 'pdf') {
      return res.status(400).json({ success: false, error: 'format 须为 docx 或 pdf' });
    }

    const jobId = crypto.randomBytes(12).toString('hex');
    const job = {
      userId,
      userContext,
      format,
      recordIds,
      total: recordIds.length,
      completed: 0,
      results: recordIds.map((id) => ({
        recordId: id,
        institutionName: null,
        status: 'pending',
        downloadToken: null,
        filename: null,
        error: null,
      })),
      status: 'running',
      createdAt: Date.now(),
    };
    batchJobs.set(jobId, job);

    setImmediate(() => processBatchJob(jobId));

    res.status(201).json({ success: true, jobId });
  } catch (error) {
    console.error('创建批量导出任务失败:', error);
    next(error);
  }
};

// @desc    Download batch export as ZIP
// @route   GET /api/reports/carbon-report-batch/:jobId/download-zip
// @access  Private
exports.downloadBatchZip = async (req, res, next) => {
  try {
    cleanupBatchJobs();
    cleanupReportDownloadStore();
    const { jobId } = req.params;
    const userId = (req.user._id && req.user._id.toString) ? req.user._id.toString() : String(req.user.id || '');
    const job = batchJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: '任务不存在或已过期' });
    }
    if (job.userId !== userId) {
      return res.status(403).json({ success: false, error: '无权下载该任务' });
    }
    if (job.status !== 'completed') {
      return res.status(400).json({ success: false, error: '任务未完成，请等待批量导出完成后打包下载' });
    }
    const doneResults = (job.results || []).filter((r) => r.status === 'done' && r.downloadToken && r.filename);
    if (doneResults.length === 0) {
      return res.status(400).json({ success: false, error: '没有可打包下载的报告' });
    }
    const entries = [];
    for (const r of doneResults) {
      const entry = reportDownloadStore.get(r.downloadToken);
      if (!entry || !entry.buffer) continue;
      entries.push({ buffer: entry.buffer, filename: r.filename });
    }
    if (entries.length === 0) {
      return res.status(400).json({ success: false, error: '下载链接已过期，请重新批量导出' });
    }
    const usedNames = new Set();
    const safeFilename = (name) => {
      let n = name;
      let i = 0;
      while (usedNames.has(n)) {
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        n = `${base}_${++i}${ext}`;
      }
      usedNames.add(n);
      return n;
    };
    const zipFilename = `碳排放报告_批量导出_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('ZIP 打包失败:', err);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'ZIP 打包失败' });
    });
    archive.pipe(res);
    for (const { buffer, filename } of entries) {
      archive.append(buffer, { name: safeFilename(filename) });
    }
    await archive.finalize();
  } catch (error) {
    console.error('批量 ZIP 下载失败:', error);
    next(error);
  }
};

// @desc    Get batch export job status
// @route   GET /api/reports/carbon-report-batch/:jobId
// @access  Private
exports.getBatchExportStatus = async (req, res, next) => {
  try {
    cleanupBatchJobs();
    const { jobId } = req.params;
    const userId = (req.user._id && req.user._id.toString) ? req.user._id.toString() : String(req.user.id || '');
    const job = batchJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: '任务不存在或已过期' });
    }
    if (job.userId !== userId) {
      return res.status(403).json({ success: false, error: '无权查看该任务' });
    }
    res.status(200).json({
      success: true,
      jobId,
      status: job.status,
      format: job.format,
      total: job.total,
      completed: job.completed,
      results: job.results.map((r) => ({
        recordId: r.recordId,
        institutionName: r.institutionName,
        status: r.status,
        downloadToken: r.downloadToken || undefined,
        filename: r.filename || undefined,
        error: r.error || undefined,
      })),
    });
  } catch (error) {
    console.error('查询批量导出状态失败:', error);
    next(error);
  }
};

// @desc    Get comparison data for a given year and region
// @route   GET /api/reports/compare
// @access  Private
exports.compareData = async (req, res, next) => {
  try {
    const { year, regionCode } = req.query;

    if (!year || !regionCode) {
      return res.status(400).json({ success: false, error: 'Year and regionCode are required' });
    }

    // Determine the city-level prefix (e.g., '150102' -> '1501')
    const cityPrefix = regionCode.substring(0, 4);
    const regionRegex = new RegExp(`^${cityPrefix}`);

    const comparisonData = await CarbonData.find({
      year: parseInt(year),
      regionCode: { $regex: regionRegex }
    }).populate('account', 'unitName'); // Populate the unit name from the Account model

    res.status(200).json({
      success: true,
      data: comparisonData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
