import React, { useState, useEffect, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { useRegions } from '../hooks/useRegions';
import axios from 'axios';

const LAST_5_YEARS_OPTION = '近5年';
const ALL_YEARS_OPTION = '全部年份';

const DataScreenRegionSelectorNew = ({ 
  selectedCity, 
  selectedDistrict, 
  selectedOrganization,
  selectedYear = '',
  availableYears = [],
  onCityChange, 
  onDistrictChange, 
  onOrganizationChange,
  onYearChange
}) => {
  const { regions, loading: regionsLoading, error: regionsError } = useRegions();
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationSearchTerm, setOrganizationSearchTerm] = useState('');

  // 获取当前用户信息
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // 根据用户角色确定哪些字段应该禁用
  const getDisabledFields = () => {
    const role = currentUser?.role;
    return {
      city: role === 'organization_user' || role === 'district_admin' || role === 'city_admin',
      district: role === 'organization_user' || role === 'district_admin',
      organization: role === 'organization_user'
    };
  };

  const disabledFields = getDisabledFields();

  // 注意：城市、区县的自动填充由父组件DataScreenPage处理
  // 机构模块直接从用户信息中获取单位名称并自动填充

  // 机构用户：直接从用户信息中获取单位名称并自动填充
  useEffect(() => {
    // 如果是机构用户且有单位名称，且还没有选择机构，则自动填充
    if (currentUser?.role === 'organization_user' && currentUser?.unitName) {
      const userUnitName = (currentUser.unitName || '').trim();
      // 如果还没有选择机构，或者选择的不匹配，则使用用户信息中的单位名称
      if (!selectedOrganization || selectedOrganization !== userUnitName) {
        if (onOrganizationChange) {
          onOrganizationChange(userUnitName);
        }
      }
    }
  }, [currentUser, selectedOrganization, onOrganizationChange]);

  // 当机构列表加载完成后，验证并确保机构选择正确
  useEffect(() => {
    // 只在机构列表加载完成且用户是机构用户时执行
    if (organizationsLoading) return; // 等待加载完成
    if (organizations.length === 0) return; // 如果没有机构列表，不执行
    if (currentUser?.role !== 'organization_user' || !currentUser?.unitName) return;
    
    // 尝试匹配机构
    const userUnitName = (currentUser.unitName || '').trim();
    const userOrg = organizations.find(org => {
      const orgName = (org.name || '').trim();
      const orgId = (org.id || '').trim();
      return orgName === userUnitName || 
             orgId === userUnitName ||
             orgName.toLowerCase() === userUnitName.toLowerCase() ||
             orgId.toLowerCase() === userUnitName.toLowerCase();
    });
    
    // 如果找到了匹配的机构，确保选择的是正确的机构ID
    if (userOrg) {
      // 如果当前选择的机构不匹配，则更新为正确的机构ID和名称（供排名图高亮等使用）
      if (!selectedOrganization || selectedOrganization !== userOrg.id) {
        if (onOrganizationChange) {
          onOrganizationChange({ id: userOrg.id, name: userOrg.name });
        }
      }
    }
  }, [organizations, organizationsLoading, currentUser, selectedOrganization, onOrganizationChange]);

  // 获取区县列表（基于选中的城市）
  const districts = useMemo(() => {
    if (!selectedCity || !regions.length) return [];
    const city = regions.find(c => c.code === selectedCity);
    return city?.children || [];
  }, [selectedCity, regions]);

  // 当区县改变时，获取该区县下的机构列表
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!selectedDistrict) {
        setOrganizations([]);
        return;
      }

      try {
        setOrganizationsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setOrganizations([]);
          return;
        }

        // 获取用户列表，然后根据区县代码过滤
        const res = await axios.get('/api/auth/users');
        if (res.data && res.data.success && res.data.data) {
          // 过滤出该区县下的机构用户（organization_user角色）
          const filteredUsers = res.data.data.filter(user => 
            user.role === 'organization_user' && 
            user.region && 
            user.region.toString() === selectedDistrict.toString()
          );
          
          // 按机构名称（unitName）分组，合并相同名称的机构
          const orgMap = new Map();
          filteredUsers.forEach(user => {
            const unitName = user.unitName || '未知机构';
            if (!orgMap.has(unitName)) {
              orgMap.set(unitName, {
                id: unitName, // 使用机构名称作为ID，用于后续过滤
                name: unitName,
                region: user.region,
                accountIds: [] // 存储该机构下所有账号ID
              });
            }
            // 添加账号ID到列表中
            const accountId = user._id || user.id;
            if (accountId && !orgMap.get(unitName).accountIds.includes(accountId)) {
              orgMap.get(unitName).accountIds.push(accountId);
            }
          });
          
          // 转换为数组
          const mergedOrgs = Array.from(orgMap.values());
          
          setOrganizations(mergedOrgs);
          
          // 注意：机构自动选择由上面的useEffect处理，这里只设置机构列表
          // 这样可以避免重复选择和时序问题
        } else {
          setOrganizations([]);
        }
      } catch (err) {
        console.error('获取机构列表失败:', err);
        setOrganizations([]);
      } finally {
        setOrganizationsLoading(false);
      }
    };

    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]); // 只在selectedDistrict改变时重新加载机构列表

  // 过滤机构列表（根据搜索关键词）
  const filteredOrganizations = useMemo(() => {
    if (!organizationSearchTerm) return organizations;
    const searchLower = organizationSearchTerm.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(searchLower)
    );
  }, [organizations, organizationSearchTerm]);

  // 获取选中的机构对象
  const selectedOrgObj = useMemo(() => {
    if (!selectedOrganization) return null;
    
    // 尝试精确匹配ID
    let org = organizations.find(org => org.id === selectedOrganization);
    if (org) return org;
    
    // 如果精确匹配失败，尝试匹配名称（去除空格）
    const selectedName = (selectedOrganization || '').trim();
    org = organizations.find(org => {
      const orgName = (org.name || '').trim();
      const orgId = (org.id || '').trim();
      return orgName === selectedName || 
             orgId === selectedName ||
             orgName.toLowerCase() === selectedName.toLowerCase() ||
             orgId.toLowerCase() === selectedName.toLowerCase();
    });
    
    // 如果找到了匹配的机构，返回它
    if (org) return org;
    
    // 如果机构列表还没有加载，但selectedOrganization有值（可能是机构名称）
    // 创建一个临时对象用于显示（当机构列表加载后会正确匹配）
    if (organizations.length === 0 && selectedOrganization) {
      return {
        id: selectedOrganization,
        name: selectedOrganization
      };
    }
    
    return null;
  }, [organizations, selectedOrganization]);

  if (regionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (regionsError) {
    return (
      <Typography color="error" variant="body2">
        {regionsError}
      </Typography>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' },
      gap: 2,
      width: 'auto',
      maxWidth: { xs: '100%', md: '800px' }
    }}>
      {/* 城市选择模块 */}
      <FormControl 
        variant="outlined" 
        size="small"
        sx={{ 
          minWidth: { xs: '100%', md: 160 },
          width: { xs: '100%', md: 160 }
        }}
      >
        <InputLabel 
          id="city-select-label" 
          sx={{ color: 'white' }}
        >
          城市
        </InputLabel>
        <Select
          labelId="city-select-label"
          id="city-select"
          value={selectedCity || ''}
          label="城市"
          onChange={onCityChange}
          disabled={disabledFields.city}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                color: 'white',
              },
            },
          }}
          sx={{
            color: 'white',
            '& .MuiSelect-select': {
              color: 'white',
            },
            '& .MuiSelect-icon': {
              color: 'white',
            },
            '& .MuiInputBase-input': {
              color: 'white',
            },
            '& .MuiOutlinedInput-input': {
              color: 'white',
            },
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.6)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#66bb6a',
            },
            '.MuiSvgIcon-root': {
              color: 'white',
            },
            '&.Mui-disabled': {
              color: 'rgba(255,255,255,0.5)',
              '& .MuiSelect-select': {
                color: 'rgba(255,255,255,0.5)',
              },
              '& .MuiInputBase-input': {
                color: 'rgba(255,255,255,0.5)',
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgba(255,255,255,0.5)',
              },
            },
          }}
        >
          {regions.map((city) => (
            <MenuItem key={city.code} value={city.code} sx={{ color: 'white' }}>
              {city.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 区县选择模块 */}
      <FormControl 
        variant="outlined" 
        size="small"
        sx={{ 
          minWidth: { xs: '100%', md: 160 },
          width: { xs: '100%', md: 160 }
        }}
      >
        <InputLabel 
          id="district-select-label" 
          sx={{ color: 'white' }}
        >
          区县
        </InputLabel>
        <Select
          labelId="district-select-label"
          id="district-select"
          value={selectedDistrict || ''}
          label="区县"
          onChange={onDistrictChange}
          disabled={disabledFields.district || !selectedCity}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                color: 'white',
              },
            },
          }}
          sx={{
            color: 'white',
            '& .MuiSelect-select': {
              color: 'white',
            },
            '& .MuiSelect-icon': {
              color: 'white',
            },
            '& .MuiInputBase-input': {
              color: 'white',
            },
            '& .MuiOutlinedInput-input': {
              color: 'white',
            },
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.6)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#66bb6a',
            },
            '.MuiSvgIcon-root': {
              color: 'white',
            },
            '&.Mui-disabled': {
              color: 'rgba(255,255,255,0.5)',
              '& .MuiSelect-select': {
                color: 'rgba(255,255,255,0.5)',
              },
              '& .MuiInputBase-input': {
                color: 'rgba(255,255,255,0.5)',
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgba(255,255,255,0.5)',
              },
            },
          }}
        >
          {districts.length === 0 ? (
            <MenuItem disabled value="" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {selectedCity ? '该城市暂无区县数据' : '请先选择城市'}
            </MenuItem>
          ) : (
            districts.map((district) => (
              <MenuItem key={district.code} value={district.code} sx={{ color: 'white' }}>
                {district.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {/* 机构搜索模块 */}
      <Box sx={{ 
        minWidth: { xs: '100%', md: 200 },
        width: { xs: '100%', md: 200 }
      }}>
        <Autocomplete
          disabled={disabledFields.organization || !selectedDistrict}
          options={filteredOrganizations}
          getOptionLabel={(option) => option.name || ''}
          value={selectedOrgObj}
          onChange={(event, newValue) => {
            if (onOrganizationChange) {
              onOrganizationChange(newValue ? { id: newValue.id, name: newValue.name } : null);
            }
          }}
          inputValue={organizationSearchTerm}
          onInputChange={(event, newInputValue) => {
            setOrganizationSearchTerm(newInputValue);
          }}
          loading={organizationsLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="机构"
              variant="outlined"
              size="small"
              disabled={disabledFields.organization || !selectedDistrict}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {organizationsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& input': {
                    color: 'white',
                  },
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.6)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#66bb6a',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,0.5)',
                    '& input': {
                      color: 'rgba(255,255,255,0.5)',
                    },
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'white',
                  '&.Mui-focused': {
                    color: '#66bb6a',
                  },
                },
              }}
            />
          )}
          PaperComponent={({ children, ...other }) => (
            <Box
              {...other}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& .MuiAutocomplete-option': {
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  },
                },
              }}
            >
              {children}
            </Box>
          )}
        />
      </Box>

      {/* 数据年份选择模块 */}
      <FormControl 
        variant="outlined" 
        size="small"
        sx={{ 
          minWidth: { xs: '100%', md: 160 },
          width: { xs: '100%', md: 160 }
        }}
      >
        <InputLabel 
          id="year-select-label" 
          sx={{ color: 'white' }}
        >
          数据年份
        </InputLabel>
        <Select
          labelId="year-select-label"
          id="year-select"
          value={selectedYear || ''}
          label="数据年份"
          onChange={onYearChange}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                color: 'white',
              },
            },
          }}
          sx={{
            color: 'white',
            '& .MuiSelect-select': {
              color: 'white',
            },
            '& .MuiSelect-icon': {
              color: 'white',
            },
            '& .MuiInputBase-input': {
              color: 'white',
            },
            '& .MuiOutlinedInput-input': {
              color: 'white',
            },
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.6)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#66bb6a',
            },
            '.MuiSvgIcon-root': {
              color: 'white',
            },
          }}
        >
          {availableYears.map((year) => (
            <MenuItem key={year} value={year} sx={{ color: 'white' }}>
              {year}
            </MenuItem>
          ))}
          <MenuItem value={LAST_5_YEARS_OPTION} sx={{ color: 'white' }}>
            {LAST_5_YEARS_OPTION}
          </MenuItem>
          <MenuItem value={ALL_YEARS_OPTION} sx={{ color: 'white' }}>
            {ALL_YEARS_OPTION}
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default DataScreenRegionSelectorNew;
