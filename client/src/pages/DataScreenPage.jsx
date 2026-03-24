import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, useMediaQuery, useTheme, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useDataScreen } from '../hooks/useDataScreen';
import ChartsGrid from '../components/ChartsGrid';
import DataScreenRegionSelectorNew from '../components/DataScreenRegionSelectorNew';

const DataScreenPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedOrganizationName, setSelectedOrganizationName] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // 获取当前用户信息
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // 根据用户角色自动填充城市、区县、机构
  useEffect(() => {
    // 如果没有用户信息，不执行
    if (!currentUser || Object.keys(currentUser).length === 0) return;

    const userRegion = currentUser.region?.toString() || '';
    const role = currentUser.role;
    const userUnitName = currentUser.unitName;

    // 超级管理员和省级管理员：不自动填充，默认显示全省数据（不选择城市和区县）
    if (role === 'superadmin' || role === 'province_admin') {
      // 不设置selectedCity和selectedDistrict，让它们保持为空
      // 这样selectedRegionCode会是空字符串，会加载所有数据
      setSelectedCity('');
      setSelectedDistrict('');
      setSelectedOrganization('');
      return;
    }

    // 如果没有region信息，无法自动填充
    if (!userRegion) return;

    // 机构用户：自动填充城市、区县、机构
    if (role === 'organization_user' && userRegion.length === 6) {
      // 强制设置区县（机构用户必须使用自己的区县）
      setSelectedDistrict(userRegion);
      // 从区县代码推导城市代码
      const cityCode = userRegion.substring(0, 4) + '00';
      setSelectedCity(cityCode);
      // 设置机构（使用机构名称，直接从用户信息中获取）
      if (userUnitName) {
        // 立即设置机构名称，不等待机构列表加载
        setSelectedOrganization(userUnitName);
      }
    }
    // 区县级管理员：自动填充城市、区县
    else if (role === 'district_admin' && userRegion.length === 6) {
      // 设置区县
      setSelectedDistrict(userRegion);
      // 从区县代码推导城市代码
      const cityCode = userRegion.substring(0, 4) + '00';
      setSelectedCity(cityCode);
    }
    // 市级管理员：自动填充城市
    else if (role === 'city_admin') {
      // 市级管理员的region可能是城市代码（如150100）或区县代码
      // 如果是城市代码（6位且以00结尾），直接使用
      if (userRegion.length === 6 && userRegion.endsWith('00')) {
        setSelectedCity(userRegion);
      }
      // 如果是区县代码（6位但不以00结尾），推导城市代码
      else if (userRegion.length === 6 && !userRegion.endsWith('00')) {
        const cityCode = userRegion.substring(0, 4) + '00';
        setSelectedCity(cityCode);
      }
      // 如果长度不是6位，尝试直接使用（可能是其他格式）
      else if (userRegion && userRegion.length > 0) {
        // 尝试从region中提取城市代码
        // 如果region是字符串且包含数字，尝试提取前4位+00
        const match = userRegion.match(/^(\d{4})/);
        if (match) {
          const cityCode = match[1] + '00';
          setSelectedCity(cityCode);
        } else {
          // 如果无法提取，直接使用原值
          setSelectedCity(userRegion);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // 当用户信息变化时执行

  // 根据选择确定regionCode：优先使用机构，其次区县，最后城市
  const selectedRegionCode = useMemo(() => {
    if (selectedOrganization) {
      // 如果选择了机构，需要根据机构获取其regionCode
      // 这里暂时使用区县代码，因为机构属于某个区县
      return selectedDistrict || selectedCity || '';
    }
    return selectedDistrict || selectedCity || '';
  }, [selectedCity, selectedDistrict, selectedOrganization]);

  // 用于接口过滤与排名图高亮的机构名称（与 selectedOrganization 可能为 id 或 name 保持一致）
  const selectedOrganizationNameForApi = useMemo(() => {
    return selectedOrganizationName || selectedOrganization || null;
  }, [selectedOrganizationName, selectedOrganization]);

  const { data, loading, error, availableYears } = useDataScreen(selectedRegionCode, selectedOrganizationNameForApi, selectedYear);

  // 当筛选条件变化导致可用年份变化时，若当前选中的年份不在新列表中则清空年份选择
  useEffect(() => {
    if (!selectedYear) return;
    const isLast5 = selectedYear === '近5年';
    const isAllYears = selectedYear === '全部年份';
    const inList = isLast5 || isAllYears || (Array.isArray(availableYears) && availableYears.includes(selectedYear));
    if (!inList) setSelectedYear('');
  }, [availableYears, selectedYear]);

  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
    setSelectedDistrict('');
    setSelectedOrganization('');
    setSelectedOrganizationName('');
  };

  const handleDistrictChange = (event) => {
    setSelectedDistrict(event.target.value);
    setSelectedOrganization('');
    setSelectedOrganizationName('');
  };

  const handleOrganizationChange = (value) => {
    if (value && typeof value === 'object' && 'id' in value) {
      setSelectedOrganization(value.id ?? '');
      setSelectedOrganizationName((value.name ?? value.id ?? '') || '');
    } else {
      const v = value || '';
      setSelectedOrganization(v);
      setSelectedOrganizationName(v);
    }
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value || '');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  // 检查是否有数据
  const hasData = data && (
    (data.cardData && data.cardData.totalEmissions) ||
    (data.rawData && data.rawData.length > 0)
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, color: 'white', minHeight: '100vh' }}>
      <Box sx={{ 
        position: 'absolute',
        top: { xs: 16, sm: 24 },
        left: { xs: 16, sm: 24 },
        zIndex: 1000
      }}>
        <IconButton 
          onClick={handleBack}
          sx={{ 
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
      </Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', md: 'center' }, 
        mb: { xs: 2, md: 3 },
        gap: { xs: 2, md: 0 }
      }}>
        <Box
          component="img"
          src="/images/sjdp.svg"
          alt="数据大屏"
          sx={{
            flexGrow: 1,
            display: 'block',
            mx: 'auto',
            maxWidth: { xs: 'min(140px, 50vw)', sm: 180, md: 220 },
            height: 'auto',
            objectFit: 'contain',
            mixBlendMode: 'lighten',
          }}
        />
      </Box>
      {/* 将行政区划选择器放在标题下面的第一行，居中显示 */}
      <Box sx={{ 
        mb: { xs: 2, md: 4 },
        display: 'flex',
        justifyContent: 'center'
      }}>
        <DataScreenRegionSelectorNew
          selectedCity={selectedCity}
          selectedDistrict={selectedDistrict}
          selectedOrganization={selectedOrganization}
          selectedYear={selectedYear}
          availableYears={availableYears}
          onCityChange={handleCityChange}
          onDistrictChange={handleDistrictChange}
          onOrganizationChange={handleOrganizationChange}
          onYearChange={handleYearChange}
        />
      </Box>
      {!hasData && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' }
          }}
        >
          暂无数据，请先填报碳排放数据
        </Alert>
      )}
      <ChartsGrid charts={data} showLast5YearsCharts={data?.showLast5YearsCharts} selectedYear={selectedYear} currentUser={currentUser} selectedRegionCode={selectedRegionCode} selectedCity={selectedCity} selectedDistrict={selectedDistrict} selectedOrganizationName={selectedOrganizationName || selectedOrganization || null} />
    </Box>
  );
};

export default DataScreenPage;
