/**
 * 碳排放报告导出工具
 * - [] 占位符：根据实际数据替换
 * - {} 占位符：通过 AI（Ollama/RAGFlow）生成内容后填充
 */
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { getRegionFullNameByCode } = require('./regionData');
const { formSections } = require('./formFields');
const EmissionFactor = require('../models/EmissionFactor');
const { canonicalizeFactorName } = require('./factorNameHelper');

// 模板仅存放在 server 目录下
const TEMPLATE_PATH = path.join(__dirname, '../templete.docx');

/**
 * 从 {} 中提取 AI 提示词
 * 支持格式: {利用"RAGFlow"中AI,询问问题"描述F.1.2碳排放管理现状"} 或 {请根据机构数据，描述...}
 * 若为 F.1.2 碳排放管理现状，会自动替换为「该条数据所在区县」的区县名称，由 RAGFlow co2yuan3 知识库生成
 */
function extractAIPrompt(text) {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  // 优先取中文引号或英文引号内的最后一段（多为问题描述）
  const quotePatterns = [
    /["\u201c\u201d]([^"\u201c\u201d]{8,})["\u201c\u201d]/g,
    /「([^」]{8,})」/g,
    /『([^』]{8,})』/g,
  ];
  for (const re of quotePatterns) {
    const matches = [...t.matchAll(re)];
    if (matches.length > 0) {
      const last = matches[matches.length - 1][1].trim();
      if (last.length >= 5) return last;
    }
  }
  // 若无引号：去掉“利用RAGFlow中AI”等前缀，取实质问题
  const prefixMatch = t.match(/^(?:利用[^，,]*中AI[,，]?(?:询问问题)?[:：]?)\s*(.+)$/s);
  if (prefixMatch) return prefixMatch[1].trim();
  return t;
}

/** 对插入 Word XML 的文本做转义 */
function escapeForWordXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 将 Markdown 转为 Word OOXML 格式，保留加粗、斜体等排版效果
 * @returns {string} 可插入到 w:p 内的 OOXML 运行序列
 */
function markdownToOoxmlRuns(text) {
  if (!text || typeof text !== 'string') return '';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const run = (content, opts = {}) => {
    const rPr = [];
    if (opts.bold) rPr.push('<w:b/>');
    if (opts.italic) rPr.push('<w:i/>');
    const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';
    const space = /^\s|\s$/.test(content) ? ' xml:space="preserve"' : '';
    return `<w:r>${rPrXml}<w:t${space}>${esc(content)}</w:t></w:r>`;
  };
  const br = () => '<w:r><w:br/></w:r>';
  let s = text;
  s = s.replace(/```[\s\S]*?```/g, (m) => m.slice(3, -3));
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/^>\s*/gm, '');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^[-*_]{3,}\s*$/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  const out = [];
  const lines = s.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) out.push(br());
    let line = lines[i];
    const listMatch = line.match(/^[\s]*[-*+]\s+/);
    const numMatch = line.match(/^[\s]*\d+\.\s+/);
    if (listMatch) line = '  • ' + line.slice(listMatch[0].length);
    else if (numMatch) line = '  ' + line.slice(numMatch[0].length);
    const segments = [];
    let rest = line;
    while (rest.length > 0) {
      const bold2 = rest.match(/\*\*([^*]+)\*\*/);
      const boldU = rest.match(/__([^_]+)__/);
      const italic = rest.match(/\*([^*]+)\*/);
      const italicU = rest.match(/_([^_]+)_/);
      let m = null;
      let format = {};
      const candidates = [
        [bold2, { bold: true }],
        [boldU, { bold: true }],
        [italic, { italic: true }],
        [italicU, { italic: true }],
      ];
      let minIdx = Infinity;
      for (const [match, fmt] of candidates) {
        if (match && match.index < minIdx) {
          minIdx = match.index;
          m = match;
          format = fmt;
        }
      }
      if (m) {
        const before = rest.slice(0, m.index);
        if (before) segments.push({ text: before, format: {} });
        segments.push({ text: m[1], format });
        rest = rest.slice(m.index + m[0].length);
      } else {
        segments.push({ text: rest, format: {} });
        break;
      }
    }
    for (const seg of segments) {
      if (seg.text) out.push(run(seg.text, seg.format));
    }
  }
  return out.join('');
}

/**
 * 从 zip 中读取 word/document.xml 并按正确编码解码为字符串
 * 模板可能为 UTF-8 或 UTF-16 LE（Word 常见），错误解码会导致中文变成
 */
function getDocumentXmlAsText(zip) {
  const entry = zip.files['word/document.xml'];
  if (!entry) return null;
  let buf;
  try {
    buf = entry.asNodeBuffer && entry.asNodeBuffer();
  } catch (_) {
    return entry.asText ? entry.asText() : null;
  }
  if (!buf || !Buffer.isBuffer(buf)) return entry.asText ? entry.asText() : null;
  let text;
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    text = buf.toString('utf16le');
    if (process.env.DEBUG_REPORT_XML === '1') console.log('[carbonReportBuilder] document.xml 编码: UTF-16 LE');
  } else if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    text = buf.toString('utf16be');
    if (process.env.DEBUG_REPORT_XML === '1') console.log('[carbonReportBuilder] document.xml 编码: UTF-16 BE');
  } else {
    text = buf.toString('utf8');
    if (process.env.DEBUG_REPORT_XML === '1' && buf.length > 0) console.log('[carbonReportBuilder] document.xml 编码: UTF-8');
  }
  if (text && text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  return text;
}

/**
 * 清理 word/document.xml 文本，使 LibreOffice headless 能可靠加载
 * - 仅做字符串级清理：控制字符、零宽字符、& 转义、XML 声明
 * - 移除 WPS 命名空间（模板若被 WPS 编辑会带 wpsCustomData），LibreOffice 不识别会报 could not be loaded
 * - 不做 parse/rebuild，避免改变 OOXML 结构导致 LibreOffice 无法加载
 */
function sanitizeDocumentXml(xmlContent) {
  if (typeof xmlContent !== 'string') return xmlContent;
  let xml = xmlContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '');
  xml = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
  xml = xml.replace(/\s*xmlns:wpsCustomData="[^"]*"/g, '');
  xml = xml.replace(/\s*wpsCustomData:[a-zA-Z0-9_]+="[^"]*"/g, '');
  if (!xml.trimStart().startsWith('<?xml')) {
    xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
  }
  return xml;
}

/**
 * 将 F.3.2 活动数据表单行改为多行：手动复制行并填充数据，避免 docxtemplater 循环作用域过大
 * 表格行数根据 emissionSources 数组动态生成，仅修改该表行，不影响 F.1、F.2、F.3 其他段落
 */
function preprocessEmissionSourcesTable(zip, emissionSources) {
  let xmlContent = getDocumentXmlAsText(zip);
  if (xmlContent == null) return zip;
  const marker = '[排放源类型]';
  const idx = xmlContent.indexOf(marker);
  if (idx === -1) return zip;

  // 从占位符位置往前找「最近」的 <w:tr>（排除 <w:trPr>：仅当 tr 后为 > 或空格才算行开始）
  const before = xmlContent.substring(0, idx);
  let lastTrOpen = -1;
  let pos = 0;
  while (pos < before.length) {
    const p = before.indexOf('<w:tr', pos);
    if (p === -1) break;
    const next = before[p + 5];
    if (next === '>' || next === ' ') lastTrOpen = p;
    pos = p + 1;
  }
  if (lastTrOpen === -1) return zip;
  const trOpenEnd = xmlContent.indexOf('>', lastTrOpen);
  if (trOpenEnd === -1) return zip;
  const trOpenTag = xmlContent.substring(lastTrOpen, trOpenEnd + 1);

  // 从占位符位置往后找匹配的 </w:tr>（需包含 [排放源的排放量] 和 [排放因子值]）
  const after = xmlContent.substring(trOpenEnd + 1);
  if (!after.includes('[排放源的排放量]') || !after.includes('[排放因子值]')) return zip;

  // 处理嵌套表格：找到与当前 <w:tr> 配对的 </w:tr>（不把 <w:trPr> 当成 <w:tr>）
  let depth = 1;
  let trCloseIdx = -1;
  let i = 0;
  while (i < after.length && depth > 0) {
    const openIdx = after.indexOf('<w:tr', i);
    const closeIdx = after.indexOf('</w:tr>', i);
    if (closeIdx === -1) break;
    const isRowOpen = openIdx !== -1 && openIdx < closeIdx && (after[openIdx + 5] === '>' || after[openIdx + 5] === ' ');
    if (isRowOpen) {
      depth += 1;
      i = openIdx + 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        trCloseIdx = closeIdx;
        break;
      }
      i = closeIdx + 1;
    }
  }
  if (trCloseIdx === -1) return zip;

  const rowContent = after.substring(0, trCloseIdx);
  const trCloseTag = '</w:tr>';
  const rowTemplate = rowContent;
  if (process.env.DEBUG_REPORT_XML === '1') {
    console.log('[carbonReportBuilder] F.3.2 定位到一行: 行内容长度', rowTemplate.length, '替换为', emissionSources.length, '行');
  }

  // 校验：本行内 trPr 开闭成对，避免替换后留下悬空标签导致 "tbl / trPr mismatch"
  const trPrOpen = (rowTemplate.match(/<w:trPr\b/g) || []).length;
  const trPrClose = (rowTemplate.match(/<\/w:trPr>/g) || []).length;
  if (trPrOpen !== trPrClose) {
    if (process.env.DEBUG_REPORT_XML === '1') console.warn('[carbonReportBuilder] F.3.2 行内 trPr 数量不一致:', trPrOpen, 'vs', trPrClose);
    // 仍继续替换，但最终 document 可能无法被 LibreOffice 加载
  }

  const newRows = emissionSources.map((item) => {
    const safe = (v) => escapeForWordXml(v ?? '');
    const factorSource = safe(item.排放因子来源 ?? '标准附录');
    let row = rowTemplate
      .replace(/<w:t>1<\/w:t>/, `<w:t>${safe(item.序号)}</w:t>`)
      .replace(/\[排放源类型\]/g, safe(item.排放源))
      .replace(/\[排放源的排放量\]/g, safe(item.活动数据))
      .replace(/\[排放因子值\]/g, safe(item.排放因子))
      .replace(/\[数据来源\]/g, safe(item.数据来源 ?? '2025年数据及方案测算'))
      .replace(/\[排放因子来源\]/g, factorSource)
      .replace(/\[备注\]/g, safe(item.备注 ?? '-'));
    // 若模板使用「标准附录」而非 [排放因子来源] 占位符，则替换独立出现的「标准附录」
    row = row.replace(/标准附录(?![ABCD])/g, factorSource);
    return trOpenTag + row + trCloseTag;
  });

  // 用下标拼接替换整行，避免 replace(fullRow, ...) 因空白/编码导致未匹配而留下悬空 </w:trPr>
  const trCloseLen = trCloseTag.length;
  const insertEnd = trOpenEnd + 1 + trCloseIdx + trCloseLen;
  xmlContent = xmlContent.substring(0, lastTrOpen) + newRows.join('') + xmlContent.substring(insertEnd);
  zip.file('word/document.xml', Buffer.from(sanitizeDocumentXml(xmlContent), 'utf8'));
  return zip;
}

/**
 * 针对 F.1.2 碳排放管理现状：若模板提示涉及该段落且提供了 regionName，则构造区县维度的 RAG 提示
 */
function augmentPromptForF12(prompt, context) {
  const regionName = context?.regionName;
  if (!regionName) return prompt;
  const lower = (prompt || '').toLowerCase();
  if (!(lower.includes('f.1.2') || lower.includes('碳排放管理现状'))) return prompt;
  return `请参考《内蒙古自治区近零碳机关试点建设方案》及各相关单位的实施细则，为我整理${regionName}的'碳排放管理现状'或'项目建设概况'。
  要求:
  1.覆盖单位： 尽量出现${regionName}的名称。
  2.内容侧重： 重点描述各单位的管理机构设置、管理制度（如核算报告、计量统计）、技术改造措施（如光伏、热泵、煤改电）以及具体的碳排放控制目标。
  3.格式要求： 保留原始数据的结构特点。如果资料中有详细的指标数据，请保留条目化列举；如果是综述性的方案，请整理成通顺的段落。
  4.描述范围（必须遵守）：正文只写${regionName}本地情况。禁止在正文中出现:东亚、中国等更大范围或国际表述;只保留与${regionName}直接相关的本地管理现状。`;
}

/**
 * 从模板 XML 中提取所有 {} 占位符的提示词，并替换为 [AI_N] 占位符
 * @param {Object} context - 可选，{ regionName } 用于 F.1.2 区县碳排放管理现状
 * @param {Function} onProgress - 可选，(percent, message) 进度回调，percent 0-100
 */
async function preprocessTemplateForAI(zip, callAI, context, onProgress) {
  let xmlContent = getDocumentXmlAsText(zip);
  if (xmlContent == null) return zip;
  const aiPrompts = [];
  const pattern = /\{([^{}]+)\}/g;

  xmlContent = xmlContent.replace(pattern, (match, content) => {
    let prompt = extractAIPrompt(content);
    prompt = augmentPromptForF12(prompt, context);
    aiPrompts.push(prompt);
    return `[AI_PLACEHOLDER_${aiPrompts.length}]`;
  });

  if (aiPrompts.length === 0) {
    return zip;
  }

  const total = aiPrompts.length;
  const results = [];
  for (let i = 0; i < total; i++) {
    const pct = total > 1 ? Math.round(15 + ((i + 1) / total) * 55) : 70;
    if (typeof onProgress === 'function') {
      onProgress(pct, `正在生成 AI 内容 (${i + 1}/${total})…`);
    }
    const text = await callAI(aiPrompts[i]);
    results.push(text);
  }

  results.forEach((text, i) => {
    const placeholder = `[AI_PLACEHOLDER_${i + 1}]`;
    const ooxml = markdownToOoxmlRuns(text || '');
    // 使用 (?:(?!</w:r>)[\s\S])*? 防止跨越 run 边界，避免误删其他内容
    const runRegex = new RegExp(
      `<w:r(?:\\s[^>]*)?>(?:(?!<\\/w:r>)[\\s\\S])*?\\[AI_PLACEHOLDER_${i + 1}\\](?:(?!<\\/w:r>)[\\s\\S])*?</w:r>`,
      'g'
    );
    const before = xmlContent;
    xmlContent = xmlContent.replace(runRegex, ooxml);
    if (xmlContent === before && xmlContent.includes(placeholder)) {
      let fallback = (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      fallback = fallback.replace(/\bw:[a-zA-Z]+="[^"]*"/g, '').replace(/\bw:[a-zA-Z]+=\S*/g, '');
      xmlContent = xmlContent.split(placeholder).join(fallback);
    }
  });
  zip.file('word/document.xml', Buffer.from(sanitizeDocumentXml(xmlContent), 'utf8'));
  return zip;
}

/** 排放源按标准顺序：固体 -> 液体 -> 气体 -> 间接 -> 逸散 */
const EMISSION_ORDER = [
  { key: 'anthracite', label: '无烟煤' }, { key: 'bituminousCoal', label: '烟煤' }, { key: 'lignite', label: '褐煤' },
  { key: 'fuelOil', label: '燃料油' }, { key: 'gasoline', label: '汽油' }, { key: 'diesel', label: '柴油' },
  { key: 'kerosene', label: '煤油' }, { key: 'lpg', label: '液化石油气' }, { key: 'lng', label: '液化天然气' },
  { key: 'naturalGas', label: '天然气' }, { key: 'cokeOvenGas', label: '焦炉煤气' }, { key: 'pipelineGas', label: '管道煤气' },
  { key: 'purchasedElectricity', label: '外购电力' }, { key: 'purchasedHeat', label: '外购热力' },
  { key: 'fugitive', label: '逸散排放' },
];

/** EMISSION_ORDER key -> 排放因子表中的 name，用于从 DB 查询结果中取显示值 */
const KEY_TO_FACTOR_NAME = {
  purchasedElectricity: 'electricity',
  purchasedHeat: 'heat',
};

/**
 * 从数据库获取排放因子，构建 key -> "value unit" 的显示用映射
 * @returns {Promise<Object>} { anthracite: "2.09 tCO₂/t", electricity: "0.6849 tCO₂e/MWh", ... }
 */
async function getEmissionFactorsForDisplay() {
  const map = {};
  try {
    const factors = await EmissionFactor.find({});
    for (const f of factors) {
      const canonical = canonicalizeFactorName(f.name);
      if (!canonical) continue;
      const displayVal = f.emissionFactor != null ? String(f.emissionFactor) : (f.value != null ? String(f.value) : '');
      const unit = f.unit ? String(f.unit).trim() : '';
      const display = unit ? `${displayVal} ${unit}` : displayVal;
      if (display) map[canonical] = display;
    }
  } catch (_) {}
  return map;
}

/**
 * 获取活动数据中不为 0 的排放源列表（用于 F.1、F.3.2 表格）
 * 同时检查 activityData 与 detailedBreakdown，确保不遗漏任何有排放的源
 */
function getActiveEmissionSources(activityData, calculatedEmissions) {
  const sources = [];
  const breakdown = calculatedEmissions?.breakdown || {};
  const detailed = calculatedEmissions?.detailedBreakdown || {};
  const ad = activityData || {};
  const solid = ad.fossilFuels?.solid || {};
  const liquid = ad.fossilFuels?.liquid || {};
  const gas = ad.fossilFuels?.gas || {};

  const getActivity = (k) => solid[k] ?? liquid[k] ?? gas[k];
  const getEmission = (k) => detailed[k];

  for (const { key, label } of EMISSION_ORDER) {
    let value = 0;
    if (key === 'fugitive') {
      const air = breakdown.airConditioning || 0;
      const fire = breakdown.fireSuppression || 0;
      value = (breakdown.fugitiveEmissions || 0) + air + fire;
    } else if (key === 'purchasedElectricity') {
      value = breakdown.electricity ?? detailed.purchasedElectricity ?? ad.indirectEmissions?.purchasedElectricity ?? 0;
    } else if (key === 'purchasedHeat') {
      value = breakdown.heat ?? detailed.purchasedHeat ?? ad.indirectEmissions?.purchasedHeat ?? 0;
    } else {
      const act = getActivity(key);
      const em = getEmission(key);
      value = Number(act) > 0 ? (em ?? act) : (em ?? 0);
    }
    const num = Number(value);
    if (num > 0) sources.push({ key, label, value: num });
  }

  return sources;
}

/**
 * 构建 [] 占位符的替换数据
 * @param {Object} record - 碳排放记录
 * @param {Object} account - 机构账户
 * @param {Object} historicalByYear - 历年历史数据
 * @param {Object} [emissionFactorsMap] - key -> "value unit" 排放因子显示映射，由 getEmissionFactorsForDisplay() 提供
 */
function buildPlaceholderData(record, account, historicalByYear, emissionFactorsMap = {}) {
  const ad = record.activityData || {};
  const im = ad.intensityMetrics || {};
  const calc = record.calculatedEmissions || {};
  const regionName = getRegionFullNameByCode(record.regionCode) || record.regionName || record.regionCode || '未知区域';
  const year = record.year || new Date().getFullYear();

  const totalEmissions = calc.totalEmissions || 0;
  const totalGreenSink = calc.breakdown?.totalGreenSink || 0;
  const netEmissions = totalEmissions - totalGreenSink;
  const area = im.buildingArea || 1;
  const personCount = im.personnelCount || 1;
  const intensityByArea = calc.emissionIntensityByArea != null ? calc.emissionIntensityByArea : (totalEmissions / area) * 1000;
  const intensityByPerson = calc.emissionIntensityByPerson != null ? calc.emissionIntensityByPerson : (totalEmissions / personCount) * 1000;

  const h2022 = historicalByYear[2022] || {};
  const h2023 = historicalByYear[2023] || {};
  const h2024 = historicalByYear[2024] || {};
  const c2022 = h2022.calculatedEmissions || {};
  const c2023 = h2023.calculatedEmissions || {};
  const c2024 = h2024.calculatedEmissions || {};
  const avgTotal = [c2022.totalEmissions, c2023.totalEmissions, c2024.totalEmissions].filter((x) => x != null).reduce((a, b) => a + b, 0) / 3;
  const avgArea = ([c2022.emissionIntensityByArea, c2023.emissionIntensityByArea, c2024.emissionIntensityByArea].filter((x) => x != null).reduce((a, b) => a + b, 0) / 3) * 1000;
  const avgPerson = ([c2022.emissionIntensityByPerson, c2023.emissionIntensityByPerson, c2024.emissionIntensityByPerson].filter((x) => x != null).reduce((a, b) => a + b, 0) / 3) * 1000;
  const imp2022 = h2022.activityData?.intensityMetrics || {};
  const imp2023 = h2023.activityData?.intensityMetrics || {};
  const imp2024 = h2024.activityData?.intensityMetrics || {};

  const formatNum = (n) => (n != null && !Number.isNaN(n) ? Number(n).toFixed(2) : '-');
  const reduction = (curr, avg) => {
    if (curr == null || avg == null || avg === 0) return '-';
    const r = ((avg - curr) / (avg + curr || 1)) * 100;
    return `${r >= 0 ? '' : ''}${r.toFixed(1)}%`;
  };

  const elecEmissions = calc.breakdown?.electricity || calc.detailedBreakdown?.purchasedElectricity || 0;
  const heatEmissions = calc.breakdown?.heat || calc.detailedBreakdown?.purchasedHeat || 0;
  const directTotal = calc.totalDirect || (calc.breakdown?.fossilFuels || 0) + (calc.breakdown?.mobileSources || 0) + (calc.breakdown?.fugitiveEmissions || 0);

  const activeSources = getActiveEmissionSources(ad, calc);
  const emissionSourceList = activeSources.map((s) => s.label).join('、') || '无';
  const directEmissionList = activeSources.filter((s) => s.label !== '外购电力' && s.label !== '外购热力').map((s) => s.label).join('、') || '无';

  // F.3.2 活动数据表：仅列出活动数据 > 0 的项
  const getEmissionFactorSource = (label) => {
    if (label === '外购电力') return '标准附录C';
    if (label === '外购热力') return '标准附录D';
    if (label === '逸散排放') return '标准附录A';
    const appendixB = ['无烟煤', '烟煤', '褐煤', '燃料油', '汽油', '柴油', '煤油', '液化石油气', '液化天然气', '天然气', '焦炉煤气', '管道煤气'];
    if (appendixB.includes(label)) return '标准附录B';
    return '标准附录';
  };
  const getEmissionFactorDisplay = (key) => {
    if (key === 'fugitive') return '-';
    const lookupKey = KEY_TO_FACTOR_NAME[key] ?? key;
    return emissionFactorsMap[lookupKey] ?? '-';
  };
  const emissionSources =
    activeSources.length > 0
      ? activeSources.map((s, i) => ({
          序号: i + 1,
          排放源: s.label,
          活动数据: s.value.toFixed(2),
          数据来源: '2025年数据及方案测算',
          排放因子: getEmissionFactorDisplay(s.key),
          排放因子来源: getEmissionFactorSource(s.label),
          备注: s.label === '逸散排放' ? '按0计算' : '-',
        }))
      : [{ 序号: '-', 排放源: '无', 活动数据: '-', 数据来源: '-', 排放因子: '-', 排放因子来源: '-', 备注: '' }];

  return {
    地区: regionName,
    单位名称: account?.unitName || '未知单位',
    数据年份: String(year),
    统一社会信用代码: account?.creditCode || '-',
    建筑面积: String(im.buildingArea ?? '-'),
    用能人数: String(im.personnelCount ?? '-'),
    用户自己填写: '相关',
    排放源类型: emissionSourceList,
    排放源的排放量: activeSources.map((s) => `${s.label}: ${s.value.toFixed(2)} tCO₂e`).join('；') || '-',
    排放因子值: '-',
    emissionSources,
    外购电力的碳排放量: formatNum(elecEmissions),
    外购热力的碳排放量: formatNum(heatEmissions),
    直接排放的所有排放源的总碳排放量: formatNum(directTotal),
    列举活动数据不为0的排放源类型: directEmissionList,
    所有数据的总碳排放量: formatNum(totalEmissions),
    '绿地碳汇的总量,用负数表示': totalGreenSink > 0 ? `-${formatNum(totalGreenSink)}` : '0',
    年度碳排放总量: formatNum(totalEmissions),
    单位建筑面积碳排放量: formatNum(intensityByArea),
    人均碳排放量: formatNum(intensityByPerson),
    '总碳排放量 - 绿地碳汇抵消量': formatNum(netEmissions),
    '2022年该机构的年度碳排放总量': formatNum(c2022.totalEmissions),
    '2023年该机构的年度碳排放总量': formatNum(c2023.totalEmissions),
    '2024年该机构的年度碳排放总量': formatNum(c2024.totalEmissions),
    '2025年该机构的年度碳排放总量': formatNum(totalEmissions),
    前三年平均值: formatNum(avgTotal),
    '(2025年该机构的年度碳排放总量)/(前三年平均值+2025年该机构的年度碳排放总量)': reduction(totalEmissions, avgTotal),
    '2022年该机构的单位建筑面积碳排放量': formatNum((c2022.emissionIntensityByArea || 0) * 1000),
    '2023年该机构的单位建筑面积碳排放量': formatNum((c2023.emissionIntensityByArea || 0) * 1000),
    '2024年该机构的单位建筑面积碳排放量': formatNum((c2024.emissionIntensityByArea || 0) * 1000),
    '202年该机构的单位建筑面积碳排放量': formatNum(intensityByArea), // 模板中"2025年"的笔误
    '(2025年该机构的单位建筑面积碳排放量)/(前三年平均值+2025年该机构的单位建筑面积碳排放量)': reduction(intensityByArea, avgArea),
    '2022年该机构的人均碳排放量': formatNum((c2022.emissionIntensityByPerson || 0) * 1000),
    '2023年该机构的人均碳排放量': formatNum((c2023.emissionIntensityByPerson || 0) * 1000),
    '2024年该机构的人均碳排放量': formatNum((c2024.emissionIntensityByPerson || 0) * 1000),
    '2025年该机构的人均碳排放量': formatNum(intensityByPerson),
    '(2025年该机构的人均碳排放量)/(前三年平均值+2025年该机构的人均碳排放量)': reduction(intensityByPerson, avgPerson),
    '2022年的用能人数': String(imp2022.personnelCount ?? '-'),
    '2023年的用能人数': String(imp2023.personnelCount ?? '-'),
    '2024年的用能人数': String(imp2024.personnelCount ?? '-'),
    '2025年的用能人数': String(im.personnelCount ?? '-'),
  };
}

/**
 * 生成填充后的 docx Buffer
 * @param {Function} onProgress - 可选，(percent, message) 进度回调，percent 0-100
 */
async function generateCarbonReportDocx(record, account, historicalByYear, callAI, onProgress) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('未找到碳排放报告模板文件 templete.docx，请将其放在 server 目录下');
  }

  const report = (pct, msg) => { if (typeof onProgress === 'function') onProgress(pct, msg); };

  report(5, '正在加载报告模板…');
  const regionName = getRegionFullNameByCode(record.regionCode) || record.regionName || record.regionCode || '';

  const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
  if (process.env.DEBUG_REPORT_XML === '1') {
    console.log('[carbonReportBuilder] 模板大小:', content.length, '路径:', TEMPLATE_PATH);
  }
  let zip = new PizZip(content);

  // 1. 预处理 {} -> [AI_N]，并调用 AI 填充（传入 regionName 供 F.1.2 区县碳排放管理现状）
  zip = await preprocessTemplateForAI(zip, callAI, { regionName }, onProgress);

  report(72, '正在填写数据与表格…');
  const emissionFactorsMap = await getEmissionFactorsForDisplay();
  const data = buildPlaceholderData(record, account, historicalByYear, emissionFactorsMap);

  // 3. 手动将 F.3.2 活动数据表单行扩展为多行（避免 docxtemplater 循环作用域过大）
  zip = preprocessEmissionSourcesTable(zip, data.emissionSources);
  if (process.env.DEBUG_REPORT_XML === '1') {
    const dx = zip.files['word/document.xml'];
    console.log('[carbonReportBuilder] preprocessEmissionSourcesTable 后 document.xml 长度:', dx ? dx.asText().length : 0);
  }

  report(78, '正在生成 Word 文档…');
  // 4. 使用 docxtemplater 替换 [] 占位符
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '[', end: ']' },
    nullGetter: () => '',
    paragraphLoop: true, // 表格行循环需要此选项
  });

  doc.render(data);
  if (process.env.DEBUG_REPORT_XML === '1') {
    const z = doc.getZip();
    const dx = z.files['word/document.xml'];
    console.log('[carbonReportBuilder] docxtemplater.render 后 document.xml 长度:', dx ? dx.asText().length : 0);
  }

  report(85, '正在整理文档格式…');
  // 5. 仅清理 <w:t>...</w:t> 内可能残留的 OOXML 属性碎片（如 w:eastAsia=），避免误删元素上的合法属性导致 LibreOffice 无法加载
  let finalZip = doc.getZip();
  let documentXmlContent = null;
  const docXml = finalZip.files['word/document.xml'];
  if (docXml) {
    let docText = getDocumentXmlAsText(finalZip) || docXml.asText();
    const lenBefore = docText.length;
    const hasReplacementChar = /\uFFFD/.test(docText);
    if (process.env.DEBUG_REPORT_XML === '1' || hasReplacementChar) {
      console.log('[carbonReportBuilder] 最终 document.xml 长度:', lenBefore, '含替换符(U+FFFD):', hasReplacementChar);
      if (hasReplacementChar) {
        const sample = docText.replace(/\s+/g, ' ').substring(0, 200);
        console.log('[carbonReportBuilder] 文本采样:', sample);
      }
    }
    docText = docText.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (_, attrs, inner) => {
      const cleaned = inner
        .replace(/>([^<]*)w:[a-zA-Z]+="[^"]*"([^<]*)</g, '>$1$2<')
        .replace(/>([^<]*)w:[a-zA-Z]+=\S*([^<]*)</g, '>$1$2<');
      return `<w:t${attrs}>${cleaned}</w:t>`;
    });
    documentXmlContent = sanitizeDocumentXml(docText);
    if (process.env.DEBUG_REPORT_XML === '1') {
      const tblOpen = (documentXmlContent.match(/<w:tbl\b/g) || []).length;
      const tblClose = (documentXmlContent.match(/<\/w:tbl>/g) || []).length;
      const trPrO = (documentXmlContent.match(/<w:trPr\b/g) || []).length;
      const trPrC = (documentXmlContent.match(/<\/w:trPr>/g) || []).length;
      console.log('[carbonReportBuilder] document.xml 清理后长度:', documentXmlContent.length, '| tbl:', tblOpen + '/' + tblClose, 'trPr:', trPrO + '/' + trPrC);
    }
  }

  report(95, '正在打包文档…');
  // 6. 在 docxtemplater 的 zip 上直接更新 word/document.xml 后生成，不再重新套用模板 ZIP，
  //    避免「模板壳 + 新 document.xml」在 PizZip.generate() 时产生与模板不一致的 ZIP 结构，导致 LibreOffice 无头无法加载
  if (documentXmlContent != null) {
    finalZip.file('word/document.xml', Buffer.from(documentXmlContent, 'utf8'));
  }
  // 不再对 word/*.xml 全量清理：诊断表明原始模板可转换，仅填充后的 document 无法加载，说明问题在 document 内容；styles/settings 等被 sanitize 后可能反而损坏

  report(100, '文档生成完成');
  return Buffer.from(
    finalZip.generate({ type: 'nodebuffer', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    'binary'
  );
}

/** 若模板文件存在则返回其 Buffer，否则返回 null（供 PDF 转换做「模板能否转换」诊断用）。 */
function getTemplateBuffer() {
  try {
    if (fs.existsSync(TEMPLATE_PATH)) return fs.readFileSync(TEMPLATE_PATH);
  } catch (_) {}
  return null;
}

module.exports = {
  buildPlaceholderData,
  generateCarbonReportDocx,
  getTemplateBuffer,
  TEMPLATE_PATH,
};
