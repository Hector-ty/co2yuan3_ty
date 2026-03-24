const formatNumber = (num) => {
  if (num == null || isNaN(num)) return "0.00";
  const value = Number(num);
  return value.toFixed(2);
};

module.exports = {
  formatNumber
};

