import React from 'react';
import { Box } from '@mui/material';
import DataEntryForm from './DataEntryForm';

const DataEntryTab = ({ regions, onSubmit }) => {
  return (
    <Box>
      <DataEntryForm regions={regions} onSubmit={onSubmit} />
    </Box>
  );
};

export default DataEntryTab;
