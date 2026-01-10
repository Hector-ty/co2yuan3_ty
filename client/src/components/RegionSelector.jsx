import React from 'react';
import {
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useRegions } from '../hooks/useRegions';

const RegionSelector = ({ value, onChange }) => {
  const { regions, loading, error } = useRegions();

  const renderOptions = () => {
    if (loading) return [<MenuItem key="loading" disabled>加载中...</MenuItem>];
    if (error) return [<MenuItem key="error" disabled>{error}</MenuItem>];
    const items = [<MenuItem key="placeholder" value=""><em>请选择地区</em></MenuItem>];
    regions.forEach((city) => {
      items.push(
        <MenuItem key={city.code} value={city.code} sx={{ fontWeight: 600 }}>
          {city.name}
        </MenuItem>
      );
      (city.children || []).forEach((district) => {
        items.push(
          <MenuItem key={district.code} value={district.code} sx={{ pl: 3 }}>
            {district.name}
          </MenuItem>
        );
      });
    });
    return items;
  };

  return (
    <FormControl fullWidth margin="normal" required error={!!error}>
      <InputLabel id="region-select-label">地区</InputLabel>
      <Select
        labelId="region-select-label"
        id="region-select"
        value={value}
        label="地区"
        onChange={onChange}
      >
        {renderOptions()}
      </Select>
    </FormControl>
  );
};

export default RegionSelector;
