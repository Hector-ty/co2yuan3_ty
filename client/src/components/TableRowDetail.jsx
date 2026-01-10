import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Edit } from '@mui/icons-material';
import InlineEditForm from './InlineEditForm';

const TableRowDetail = ({ record, isEditing, onEdit, onSave, onCancel }) => {
  if (isEditing) {
    return <InlineEditForm record={record} onSave={onSave} onCancel={onCancel} />;
  }

  return (
    <Box>
      <Typography variant="h6">分类排放详情:</Typography>
      <ul>
        <li>化石燃料燃烧: {(record.calculatedEmissions?.breakdown?.fossilFuels || 0).toFixed(2)} tCO₂</li>
        <li>移动源燃烧: {(record.calculatedEmissions?.breakdown?.mobileSources || 0).toFixed(2)} tCO₂</li>
        <li>外购电力: {(record.calculatedEmissions?.breakdown?.electricity || 0).toFixed(2)} tCO₂</li>
        <li>外购热力: {(record.calculatedEmissions?.breakdown?.heat || 0).toFixed(2)} tCO₂</li>
      </ul>
      <Button startIcon={<Edit />} onClick={onEdit}>编辑</Button>
    </Box>
  );
};

export default TableRowDetail;
