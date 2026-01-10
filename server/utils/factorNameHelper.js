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

const canonicalizeFactorName = (name) => {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (aliasMap[trimmed]) return aliasMap[trimmed];
  const stripped = stripParentheses(trimmed);
  if (aliasMap[stripped]) return aliasMap[stripped];
  return trimmed;
};

module.exports = {
  canonicalizeFactorName,
  aliasMap,
  SPECIAL_NAME_OVERRIDES
};


