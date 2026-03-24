/**
 * 统一数字展示：整数保持整数，非整数保留 2 位小数
 * @param {number|string|null|undefined} num
 * @returns {string}
 */
export function formatNumber(num) {
  const n = Number(num);
  if (isNaN(n)) return String(num ?? '');
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}
