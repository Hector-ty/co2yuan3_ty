/**
 * 数据大屏 - 正方形图表模块尺寸总控制器
 * 统一管理所有正方形图表的边长大小，修改此处即可全局生效
 */

/** 正方形图表的边长配置（响应式 minHeight） */
export const DATA_SCREEN_SQUARE_CHART = {
  /** 宽高比 1:1 */
  aspectRatio: '1',
  /** 各断点下的最小高度（即正方形边长） */
  minHeight: {
    xs: '320px',  // 超小屏
    sm: '300px',  // 小屏
    md: '400px',  // 中屏及以上
  },
};

/** 获取可直接用于 sx 的 Paper 样式（正方形图表容器） */
export const getDataScreenSquareChartSx = (overrides = {}) => ({
  aspectRatio: DATA_SCREEN_SQUARE_CHART.aspectRatio,
  minHeight: DATA_SCREEN_SQUARE_CHART.minHeight,
  ...overrides,
});
