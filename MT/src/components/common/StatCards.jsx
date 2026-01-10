import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const StatCards = ({ cardData }) => {
  if (!cardData) return null;

  const cards = [
    {
      title: '总碳排放量',
      value: cardData.totalEmissions?.value || '0',
      unit: 'tCO₂',
      change: cardData.totalEmissions?.change || '0',
      isPositive: cardData.totalEmissions?.isPositive || false,
    },
    {
      title: '人均碳排放量',
      value: cardData.perCapitaEmissions?.value || '0',
      unit: 'tCO₂/人',
      change: cardData.perCapitaEmissions?.change || '0',
      isPositive: cardData.perCapitaEmissions?.isPositive || false,
    },
    {
      title: '单位面积排放',
      value: cardData.perAreaEmissions?.value || '0',
      unit: 'tCO₂/m²',
      change: cardData.perAreaEmissions?.change || '0',
      isPositive: cardData.perAreaEmissions?.isPositive || false,
    },
    {
      title: '减排目标完成率',
      value: cardData.targetCompletion?.value || '0',
      unit: '%',
      change: cardData.targetCompletion?.change || '0',
      isPositive: cardData.targetCompletion?.isPositive || false,
    },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => (
        <Grid item xs={6} key={index}>
          <Card 
            sx={{ 
              background: 'rgba(26, 31, 58, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ fontSize: '0.75rem', display: 'block', mb: 1 }}
              >
                {card.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold',
                    color: '#fff',
                    mr: 0.5
                  }}
                >
                  {card.value}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.7rem' }}
                >
                  {card.unit}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {card.isPositive ? (
                  <TrendingUpIcon sx={{ fontSize: '0.875rem', color: '#f44336', mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: '0.875rem', color: '#66bb6a', mr: 0.5 }} />
                )}
                <Typography 
                  variant="caption"
                  sx={{ 
                    fontSize: '0.7rem',
                    color: card.isPositive ? '#f44336' : '#66bb6a'
                  }}
                >
                  {card.change}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default StatCards;
