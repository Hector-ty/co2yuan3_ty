import React from 'react';
import { Grid } from '@mui/material';
import DataCard from './DataCard';

const StatCardsGrid = ({ data }) => {
  if (!data) return null;

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
      <Grid item xs={12} sm={6} md={4}>
        <DataCard
          title="总碳排放量"
          value={data.totalEmissions.value}
          change={data.totalEmissions.change}
          unit="tCO₂"
          changeUnit="%"
          isPositive={data.totalEmissions.isPositive}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <DataCard
          title="人均碳排放量"
          value={data.perCapitaEmissions.value}
          change={data.perCapitaEmissions.change}
          unit="tCO₂/人"
          changeUnit="%"
          isPositive={data.perCapitaEmissions.isPositive}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <DataCard
          title="单位面积排放"
          value={data.perAreaEmissions.value}
          change={data.perAreaEmissions.change}
          unit="tCO₂/m²"
          changeUnit="%"
          isPositive={data.perAreaEmissions.isPositive}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <DataCard
          title="减排目标完成率"
          value={data.targetCompletion.value}
          change={data.targetCompletion.change}
          unit="%"
          changeUnit="%"
          isPositive={data.targetCompletion.isPositive}
        />
      </Grid>
    </Grid>
  );
};

export default StatCardsGrid;
