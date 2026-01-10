import React, { useState } from 'react';
import { TextField, Button, Select, MenuItem, InputLabel, FormControl, Box } from '@mui/material';
import { Search } from '@mui/icons-material';

const SearchBar = ({ regions, onSearch, onExport, isExportDisabled }) => {
  const [searchYear, setSearchYear] = useState('');
  const [searchRegion, setSearchRegion] = useState('');

  const handleSearchClick = () => {
    onSearch(searchYear, searchRegion);
  };

  const renderRegionOptions = () => {
    const items = [<MenuItem key="all" value=""><em>所有行政区</em></MenuItem>];
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
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', sm: 'row' },
      gap: { xs: 1.5, sm: 2 }, 
      mb: 2, 
      alignItems: { xs: 'stretch', sm: 'center' } 
    }}>
      <TextField
        type="number"
        label="年份"
        variant="outlined"
        size="small"
        value={searchYear}
        onChange={(e) => setSearchYear(e.target.value)}
        sx={{ flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
      />
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}>
        <InputLabel>行政区</InputLabel>
        <Select value={searchRegion} label="行政区" onChange={(e) => setSearchRegion(e.target.value)}>
          {renderRegionOptions()}
        </Select>
      </FormControl>
      <Button 
        variant="contained" 
        startIcon={<Search />} 
        onClick={handleSearchClick}
        sx={{ flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
      >
        搜索
      </Button>
      <Button 
        variant="outlined" 
        onClick={onExport} 
        disabled={isExportDisabled}
        sx={{ flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
      >
        导出为 CSV
      </Button>
    </Box>
  );
};

export default SearchBar;
