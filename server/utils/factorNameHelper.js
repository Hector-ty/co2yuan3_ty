const { formSections } = require('./formFields');

const SPECIAL_NAME_OVERRIDES = {
  purchasedElectricity: 'electricity',
  purchasedHeat: 'heat'
};

const stripParentheses = (value = '') => value.replace(/\(.*?\)/g, '').trim();

const addAlias = (map, alias, canonical) => {
  if (!alias || !canonical) return;
  const trimmed = alias.trim();
  if (!trimmed) return;
  map[trimmed] = canonical;
};

const processField = (map, field) => {
  if (!field?.name?.length) return;
  const rawKey = field.name[field.name.length - 1];
  const canonical = SPECIAL_NAME_OVERRIDES[rawKey] || rawKey;

  addAlias(map, canonical, canonical);
  addAlias(map, rawKey, canonical);

  if (!field.label) return;

  addAlias(map, field.label, canonical);
  addAlias(map, stripParentheses(field.label), canonical);

  const [firstPart] = field.label.split(' ');
  if (firstPart) {
    addAlias(map, firstPart, canonical);
    addAlias(map, stripParentheses(firstPart), canonical);
  }
};

const buildAliasMap = () => {
  const map = {};
  formSections.forEach(section => {
    if (section.panels) {
      section.panels.forEach(panel => {
        panel.fields.forEach(field => processField(map, field));
      });
    } else if (section.fields) {
      section.fields.forEach(field => processField(map, field));
    }
  });
  return map;
};

const aliasMap = buildAliasMap();

// 扩展映射：支持数据库中的中文名称
const extendedAliasMap = {
  '外购电力': 'electricity',
  '外购热力': 'heat',
  '净外购电量': 'electricity',
  '净外购热力': 'heat',
  '乔木': 'tree',
  '灌木': 'shrub',
  '草本': 'herb'
};

const canonicalizeFactorName = (name) => {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  
  // 首先检查扩展映射（数据库中的中文名称）
  if (extendedAliasMap[trimmed]) {
    return extendedAliasMap[trimmed];
  }
  
  // 然后检查从表单字段构建的映射
  if (aliasMap[trimmed]) return aliasMap[trimmed];
  const stripped = stripParentheses(trimmed);
  if (aliasMap[stripped]) return aliasMap[stripped];
  
  // 最后检查扩展映射的去除括号版本
  if (extendedAliasMap[stripped]) {
    return extendedAliasMap[stripped];
  }
  
  return trimmed;
};

module.exports = {
  canonicalizeFactorName,
  aliasMap,
  SPECIAL_NAME_OVERRIDES
};


