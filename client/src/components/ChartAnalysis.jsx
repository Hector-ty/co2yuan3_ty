import React, { useState } from 'react';
import {
  Grid, Paper, Typography, Card, CardHeader, CardContent,
  FormControlLabel, Checkbox, Box, Alert, Snackbar
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import EmissionPieChart from './charts/EmissionPieChart';
import IntensityBarChart from './charts/IntensityBarChart';
import YearlyEmissionBarChart from './charts/YearlyEmissionBarChart';
import AnnualChangeLineChart from './charts/AnnualChangeLineChart';

const MotionBox = motion(Box);

const ChartAnalysis = ({ selectedRecord, allData }) => {
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 安全地过滤数据，添加空值检查
  const yearlyDataForSelectedRegion = (allData || []).filter(
    d => d && selectedRecord && d.regionCode && selectedRecord.regionCode && d.regionCode === selectedRecord.regionCode
  );

  const handleCompare = async (e) => {
    const checked = e.target.checked;
    setCompareMode(checked);
    if (!checked || !selectedRecord) {
      setComparisonData([]);
      return;
    }
    try {
      const res = await axios.get('/api/reports/compare', { params: { year: selectedRecord.year, regionCode: selectedRecord.regionCode } });
      setComparisonData(res.data.data);
      setSuccess(`已加载 ${res.data.data.length} 条同级别单位数据用于对比`);
    } catch (err) {
      setError('获取对比数据失败');
      setCompareMode(false);
    }
  };

  if (!selectedRecord) {
    return null;
  }

  // 安全地获取数据，防止 undefined 错误
  const breakdown = selectedRecord?.calculatedEmissions?.breakdown || {};
  // 后端返回的是 emissionIntensityByArea 和 emissionIntensityByPerson，需要映射到 perArea 和 perCapita
  const calculatedEmissions = selectedRecord?.calculatedEmissions || {};
  const intensity = {
    perArea: calculatedEmissions.emissionIntensityByArea,
    perCapita: calculatedEmissions.emissionIntensityByPerson
  };
  const regionName = selectedRecord?.regionName || selectedRecord?.regionCode || '未知区域';
  const year = selectedRecord?.year || '';

  return (
    <AnimatePresence>
      <MotionBox
        id="chart-analysis-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        sx={{ mt: 4 }}
      >
        <Card>
          <CardHeader
            title={`${year}年 ${regionName} - 图表分析`}
            titleTypographyProps={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            action={
              <FormControlLabel
                control={<Checkbox checked={compareMode} onChange={handleCompare} size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>与同级别单位对比</Typography>}
                sx={{ mr: { xs: 0, sm: 1 } }}
              />
            }
            sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' } }}
          />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, p: { xs: 1, sm: 2 } }}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {/* 第一行：排放构成、排放强度（网页端） */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: { xs: 1.5, sm: 2, md: 2 }, // 移动端和网页端padding
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '100%',
                  aspectRatio: { xs: '1', sm: '1', md: '1' }, // 所有尺寸下保持正方形
                  minHeight: { xs: '380px', sm: '300px', md: '400px' }, // 移动端增大初始大小，网页端统一大小
                  height: { md: '400px' }, // 网页端固定高度，确保大小完全相同
                  maxHeight: { md: '400px' } // 网页端最大高度，确保大小完全相同
                }}>
                  <Typography variant="h6" align="center" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放构成</Typography>
                  <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <EmissionPieChart 
                      data={breakdown} 
                      comparisonData={comparisonData}
                      compareMode={compareMode}
                    />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: { xs: 1.5, sm: 2, md: 2 }, // 移动端和网页端padding
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '100%',
                  aspectRatio: { xs: '1', sm: '1', md: '1' }, // 所有尺寸下保持正方形
                  minHeight: { xs: '380px', sm: '300px', md: '400px' }, // 移动端增大初始大小，网页端统一大小
                  height: { md: '400px' }, // 网页端固定高度，确保大小完全相同
                  maxHeight: { md: '400px' } // 网页端最大高度，确保大小完全相同
                }}>
                  <Typography variant="h6" align="center" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放强度</Typography>
                  <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <IntensityBarChart
                      recordData={{...intensity, regionName: regionName}}
                      comparisonData={comparisonData}
                      compareMode={compareMode}
                    />
                  </Box>
                </Paper>
              </Grid>
              {/* 第二行：年度排放量、年均变化率（网页端） */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: { xs: 1.5, sm: 2, md: 2 }, // 移动端和网页端padding
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '100%',
                  aspectRatio: { xs: '1', sm: '1', md: '1' }, // 所有尺寸下保持正方形
                  minHeight: { xs: '380px', sm: '300px', md: '400px' }, // 移动端增大初始大小，网页端统一大小
                  height: { md: '400px' }, // 网页端固定高度，确保大小完全相同
                  maxHeight: { md: '400px' } // 网页端最大高度，确保大小完全相同
                }}>
                  <Typography variant="h6" align="center" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>年度排放量</Typography>
                  <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <YearlyEmissionBarChart
                      yearlyData={yearlyDataForSelectedRegion}
                      currentYear={selectedRecord.year}
                      comparisonData={comparisonData}
                      compareMode={compareMode}
                    />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: { xs: 1.5, sm: 2, md: 2 }, // 移动端和网页端padding
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '100%',
                  aspectRatio: { xs: '1', sm: '1', md: '1' }, // 所有尺寸下保持正方形
                  minHeight: { xs: '380px', sm: '300px', md: '400px' }, // 移动端增大初始大小，网页端统一大小
                  height: { md: '400px' }, // 网页端固定高度，确保大小完全相同
                  maxHeight: { md: '400px' } // 网页端最大高度，确保大小完全相同
                }}>
                  <Typography variant="h6" align="center" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>年均变化率</Typography>
                  <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <AnnualChangeLineChart 
                      yearlyData={yearlyDataForSelectedRegion} 
                      compareMode={compareMode}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 成功/错误提示 */}
        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!error}
          autoHideDuration={3000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </MotionBox>
    </AnimatePresence>
  );
};

export default ChartAnalysis;
