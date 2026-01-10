import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button, Grid, TextField, Typography, Box, Alert } from '@mui/material';
import axios from 'axios';

const InlineEditForm = ({ record, onSave, onCancel }) => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      coal: record.activityData.fossilFuels?.solid?.coal || 0,
      crudeOil: record.activityData.fossilFuels?.liquid?.crudeOil || 0,
      naturalGas: record.activityData.fossilFuels?.gas?.naturalGas || 0,
      purchasedElectricity: record.activityData.indirectEmissions?.purchasedElectricity || 0,
      purchasedHeat: record.activityData.indirectEmissions?.purchasedHeat || 0,
    }
  });
  const [error, setError] = React.useState('');

  const onFinish = async (values) => {
    const payload = {
      year: record.year,
      regionCode: record.regionCode,
      activityData: {
        fossilFuels: {
            solid: { coal: Number(values.coal) },
            liquid: { crudeOil: Number(values.crudeOil) },
            gas: { naturalGas: Number(values.naturalGas) },
        },
        mobileSources: record.activityData.mobileSources || {},
        indirectEmissions: {
            purchasedElectricity: Number(values.purchasedElectricity),
            purchasedHeat: Number(values.purchasedHeat),
        },
        intensityMetrics: record.activityData.intensityMetrics,
      }
    };

    try {
      const res = await axios.put(`/api/carbon-data/${record._id}`, payload);
      if (res.data.success) {
        onSave();
      }
    } catch (err) {
      setError(err.response?.data?.error || '更新失败');
    }
  };

  return (
    <form onSubmit={handleSubmit(onFinish)}>
      <Typography variant="h6" gutterBottom>直接编辑分类排放数据:</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Controller
            name="coal"
            control={control}
            render={({ field }) => <TextField {...field} type="number" label="煤炭 (吨)" fullWidth variant="outlined" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="crudeOil"
            control={control}
            render={({ field }) => <TextField {...field} type="number" label="原油 (吨)" fullWidth variant="outlined" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="naturalGas"
            control={control}
            render={({ field }) => <TextField {...field} type="number" label="天然气 (万立方米)" fullWidth variant="outlined" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="purchasedElectricity"
            control={control}
            render={({ field }) => <TextField {...field} type="number" label="外购电力 (万千瓦时)" fullWidth variant="outlined" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="purchasedHeat"
            control={control}
            render={({ field }) => <TextField {...field} type="number" label="外购热力 (吉焦)" fullWidth variant="outlined" size="small" />}
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button type="submit" variant="contained">保存</Button>
        <Button variant="outlined" onClick={onCancel}>取消</Button>
      </Box>
    </form>
  );
};

export default InlineEditForm;
