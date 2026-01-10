import React, { useState } from 'react';
import {
  FormControl, InputLabel, Select, List, ListItem, ListItemText, Collapse, Box, Typography
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useRegions } from '../hooks/useRegions';

const DataScreenRegionSelector = ({ value, onChange }) => {
  const { regions, loading, error } = useRegions();
  const [open, setOpen] = useState({}); // State to manage collapse for cities

  const handleCityClick = (cityCode) => {
    setOpen(prevOpen => ({ ...prevOpen, [cityCode]: !prevOpen[cityCode] }));
  };

  const handleRegionSelect = (regionCode) => {
    onChange({ target: { value: regionCode } }); // Simulate event object for onChange prop
  };

  if (loading) return <Typography color="textSecondary">加载地区数据...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <FormControl fullWidth margin="none" variant="outlined" size="small">
      <InputLabel id="data-screen-region-select-label" sx={{ color: 'white' }}>行政区划</InputLabel>
      <Select
        labelId="data-screen-region-select-label"
        id="data-screen-region-select"
        value={value}
        label="行政区划"
        onChange={onChange} // Keep the original onChange for the Select component itself
        renderValue={(selected) => {
          const selectedRegion = regions.flatMap(c => [c, ...(c.children || [])]).find(r => r.code === selected);
          return selectedRegion ? selectedRegion.name : '请选择行政区划';
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 300, // Limit height of the dropdown menu
              backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker semi-transparent background
              backdropFilter: 'blur(10px)',
              color: 'white',
            },
          },
        }}
        sx={{
          color: 'white',
          '.MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.6)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#66bb6a', // Use primary color for focus
          },
          '.MuiSvgIcon-root': { // Arrow icon color
            color: 'white',
          },
        }}
      >
        {regions.map((city) => (
          <div key={city.code}>
            <ListItem
              onClick={(event) => {
                event.stopPropagation(); // Prevent Select from closing on city click
                handleCityClick(city.code);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation(); // Prevent Select from closing on city double click
                handleRegionSelect(city.code);
              }}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                backgroundColor: value === city.code ? 'rgba(255,255,255,0.2)' : 'transparent',
              }}
            >
              <ListItemText primary={city.name} sx={{ color: 'white' }} />
              {Array.isArray(city.children) && city.children.length > 0 ? (open[city.code] ? <ExpandLess sx={{ color: 'white' }} /> : <ExpandMore sx={{ color: 'white' }} />) : null}
            </ListItem>
            <Collapse in={open[city.code]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {Array.isArray(city.children) && city.children.map((district) => (
                  <ListItem
                    key={district.code}
                    sx={{
                      pl: 4,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                      backgroundColor: value === district.code ? 'rgba(255,255,255,0.2)' : 'transparent',
                    }}
                    onClick={(event) => {
                      event.stopPropagation(); // Prevent Select from closing on district click
                      handleRegionSelect(district.code);
                    }}
                  >
                    <ListItemText primary={district.name} sx={{ color: 'white' }} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </div>
        ))}
      </Select>
    </FormControl>
  );
};

export default DataScreenRegionSelector;
