import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { getDataScreenSquareChartSx } from '../config/dataScreenCharts';
import DonutChart from './charts/DonutChart';
import StackedAreaChart from './charts/StackedAreaChart';
import DualAxisChart from './charts/DualAxisChart';
import LineChart from './charts/LineChart';
import StackedBarChart from './charts/StackedBarChart';
import EmissionMapChart from './charts/EmissionMapChart';
import InstitutionRankingBarChart from './charts/InstitutionRankingBarChart';
import BenchmarkBarChart from './charts/BenchmarkBarChart';
import EmissionIntensityPanel from './EmissionIntensityPanel';
import DoubleDonutChart from './charts/DoubleDonutChart';
import ErrorBoundary from './ErrorBoundary';

// 无数据时的默认结构，保证「同级机构强度排名图」等模块在初次进入时仍能显示（如「请选择城市」）
const defaultCharts = {
  cardData: null,
  donutData: [],
  doubleDonutData: { totalDirect: 0, totalIndirect: 0, detailedBreakdown: {} },
  stackedAreaChartData: { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] },
  stackedBarChartData: { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] },
  dualAxisChartData: { years: [], areaIntensity: [], perCapitaIntensity: [] },
  lineChartData: { years: [], changeRates: [] },
  intensityBarData: { perCapita: 0, perArea: 0 },
  institutionRankingData: [],
  benchmarkBarData: null,
  rawData: [],
};

const ChartsGrid = ({ charts, showLast5YearsCharts = false, selectedYear = '', currentUser, selectedRegionCode = '', selectedCity = '', selectedDistrict = '', selectedOrganizationName = null }) => {
  const safeCharts = charts ?? defaultCharts;

  const isOrganizationUser = currentUser?.role === 'organization_user';
  const isAllYears = selectedYear === '全部年份';
  // 选中机构时用所选机构名称高亮；未选机构但为机构用户时用当前用户单位名称高亮
  const highlightUnitName = selectedOrganizationName || (isOrganizationUser ? (currentUser?.unitName || null) : null);

  // 排放源占比、碳排放强度、排放源细分：非近5年时显示，或选择「全部年份」时也显示
  const showSingleYearCharts = !showLast5YearsCharts || isAllYears;

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ justifyContent: 'center' }}>
      {/* 第一行：排放源占比（非近5年时显示，选择全部年份时也显示）、近5年/全部年份排放源结构变化、单位建筑面积/人均碳排放 */}
      {showSingleYearCharts && (
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放源占比</Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <DonutChart data={safeCharts.donutData} />
            </Box>
          </Paper>
        </Grid>
      )}
      {showLast5YearsCharts && (
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>
              {selectedYear === '全部年份' ? '排放源结构变化' : '近5年排放源结构变化'}
            </Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <StackedAreaChart data={safeCharts.stackedAreaChartData} />
            </Box>
          </Paper>
        </Grid>
      )}
      {showLast5YearsCharts && (
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>单位建筑面积/人均碳排放</Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <DualAxisChart data={safeCharts.dualAxisChartData} />
            </Box>
          </Paper>
        </Grid>
      )}
      {/* 碳排放强度指标对比图（非近5年时显示，选择全部年份时也显示） */}
      {showSingleYearCharts && (
        <Grid item xs={12} sm={6} md={4}>
          <EmissionIntensityPanel data={safeCharts.intensityBarData} title="碳排放强度指标对比图" />
        </Grid>
      )}
      {/* 第二行：碳排放总量趋势图（仅选择「近5年」时显示）、年度排放量构成 */}
      {showLast5YearsCharts && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>碳排放总量趋势图</Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <LineChart data={safeCharts.lineChartData} />
            </Box>
          </Paper>
        </Grid>
      )}
      {showLast5YearsCharts && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>年度排放量构成</Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <StackedBarChart data={safeCharts.stackedBarChartData} />
            </Box>
          </Paper>
        </Grid>
      )}
      {/* 排放源细分构成图（非近5年时显示，选择全部年份时也显示） */}
      {showSingleYearCharts && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放源细分构成图</Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <DoubleDonutChart data={safeCharts.doubleDonutData} />
            </Box>
          </Paper>
        </Grid>
      )}
      {/* 同级机构强度排名图：根据城市/区县选择与数据情况显示图表或提示文案 */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 },
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          ...getDataScreenSquareChartSx(),
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>同级机构强度排名图</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <InstitutionRankingBarChart
              data={safeCharts.institutionRankingData}
              highlightUnitName={highlightUnitName}
              selectedCity={selectedCity ?? ''}
              selectedDistrict={selectedDistrict ?? ''}
            />
          </Box>
        </Paper>
      </Grid>
      {/* 同类型机构强度指标对比图：选机构后展示当前机构 vs 省内同类型机构人均碳排放对比 */}
      <Grid item xs={12} md={6}>
        <Paper sx={{
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...getDataScreenSquareChartSx(),
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>同类型机构强度指标对比图</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <BenchmarkBarChart
              data={safeCharts.benchmarkBarData}
              selectedCity={selectedCity ?? ''}
              selectedDistrict={selectedDistrict ?? ''}
              selectedOrganizationName={highlightUnitName}
            />
          </Box>
        </Paper>
      </Grid>
      {/* 排放地图模块；机构用户隐藏 */}
      {!isOrganizationUser && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
            pb: { xs: 2, sm: 2 }, // 确保底部有足够的padding
            display: 'flex', 
            flexDirection: 'column',
            width: '100%',
            ...getDataScreenSquareChartSx(),
            mb: { xs: 2, sm: 0 }, // 移动端添加底部边距
            overflow: 'hidden' // 防止内容溢出
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放地图</Typography>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
              <ErrorBoundary title="排放地图加载失败" message="很抱歉，加载排放地图时出现问题。请稍后重试。">
                <EmissionMapChart data={safeCharts.rawData} isDataScreen={true} selectedRegionCode={selectedRegionCode} />
              </ErrorBoundary>
            </Box>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default ChartsGrid;
