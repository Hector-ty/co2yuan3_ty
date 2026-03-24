import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { getDataScreenSquareChartSx } from '../config/dataScreenCharts';
import IntensityBarChart from './charts/IntensityBarChart';

/**
 * 数据大屏专用：排放强度面板（人均/单位面积）
 * - 复用历史记录里的 IntensityBarChart
 * - 默认深色背景，适配大屏整体风格
 */
const EmissionIntensityPanel = ({ data, title = '碳排放强度指标对比图' }) => {
  return (
    <Paper
      sx={{
        p: { xs: 1.5, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        ...getDataScreenSquareChartSx(),
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}
      >
        {title}
      </Typography>
      <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
        <IntensityBarChart recordData={data} comparisonData={[]} compareMode={false} />
      </Box>
    </Paper>
  );
};

export default EmissionIntensityPanel;

