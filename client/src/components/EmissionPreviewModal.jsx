import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { formatNumber } from '../utils/formatNumber';

/**
 * 碳排放计算结果预览模态框
 * 按 template 结构展示：直接排放、间接排放、总计、强度指标；每项含公式+结果。
 */
const EmissionPreviewModal = ({
  open,
  onClose,
  onConfirm,
  preview,
  isSubmitting,
  confirmLabel = '确认并提交数据',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState({ direct: true, greenSink: true, indirect: true, intensity: true });

  const handleAccordionChange = (panel) => (_, isExp) => {
    setExpanded((prev) => ({ ...prev, [panel]: isExp }));
  };

  if (!preview) return null;

  const { direct, greenSink, indirect, totalEmissions, totalGreenSink, intensity } = preview;
  const isDark = theme.palette.mode === 'dark';

  const formatVal = (n) => (n != null && !Number.isNaN(n) ? formatNumber(n) : '—');

  const paperSx = {
    p: 2,
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
  };

  const sectionTitleSx = {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: theme.palette.text.primary,
    mb: 1.5,
    letterSpacing: '0.02em',
  };

  const subTitleSx = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    mb: 0.75,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap',
  };

  const itemRowSx = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    py: 1,
    px: 1.5,
    mb: 1,
    borderRadius: 1.5,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    '&:last-of-type': { mb: 0 },
  };

  const labelValueRowSx = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 1,
  };

  const formulaSx = {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.4,
  };

  const valueSx = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette.primary.main,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
  };

  const accordionSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 2,
    backgroundColor: paperSx.backgroundColor,
    boxShadow: 'none',
    '&:before': { display: 'none' },
    '&.Mui-expanded': { margin: 0 },
    '& + &': { mt: 1 },
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          backgroundImage: 'none',
          backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: { xs: '1.15rem', sm: '1.35rem' },
          py: { xs: 2, sm: 2.5 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }}
      >
        碳排放计算结果预览
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, pb: 2, px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            maxHeight: '80vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pr: 0.5,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
          }}
        >
          {/* 直接排放 */}
          <Accordion expanded={expanded.direct} onChange={handleAccordionChange('direct')} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}>
              <Typography sx={sectionTitleSx}>直接排放</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            {direct?.fossilFuels && (
              <Box sx={{ mb: 1.5 }}>
                <Box sx={subTitleSx}>
                  <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>化石燃料燃烧 (Crs)</Typography>
                  <Typography component="span" sx={{ fontWeight: 700, color: theme.palette.primary.main, fontVariantNumeric: 'tabular-nums' }}>{formatVal(direct.fossilFuels.total)} tCO₂e</Typography>
                </Box>
                <Box sx={{ pl: 1 }}>
                  {(direct.fossilFuels.items || []).map((item) => (
                    <Box key={item.label} sx={itemRowSx}>
                      <Box sx={labelValueRowSx}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.label}:</Typography>
                        <Typography sx={valueSx}>{formatVal(item.emission)} tCO₂e</Typography>
                      </Box>
                      <Typography sx={formulaSx}>{item.formula}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {direct?.fugitive && (
              <Box>
                <Box sx={subTitleSx}>
                  <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>逸散排放 (Cys)</Typography>
                  <Typography component="span" sx={{ fontWeight: 700, color: theme.palette.primary.main, fontVariantNumeric: 'tabular-nums' }}>{formatVal(direct.fugitive.total)} tCO₂e</Typography>
                </Box>
                <Box sx={{ pl: 1 }}>
                  {(direct.fugitive.items || []).map((item) => (
                    <Box key={item.label} sx={itemRowSx}>
                      <Box sx={labelValueRowSx}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.label}:</Typography>
                        <Typography sx={valueSx}>{formatVal(item.emission)} tCO₂e</Typography>
                      </Box>
                      <Typography sx={formulaSx}>{item.formula}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            <Box
              sx={{
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px dashed ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>直接排放小计 (Czj)</Typography>
              <Typography sx={{ ...valueSx, color: theme.palette.text.primary }}>{formatVal(direct?.directTotal)} tCO₂e</Typography>
            </Box>
            </AccordionDetails>
          </Accordion>

          {/* 间接排放 */}
          <Accordion expanded={expanded.indirect} onChange={handleAccordionChange('indirect')} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}>
              <Typography sx={sectionTitleSx}>间接排放</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            {indirect?.electricity && (
              <Box sx={itemRowSx}>
                <Box sx={labelValueRowSx}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>净外购电力 (Cdl):</Typography>
                  <Typography sx={valueSx}>{formatVal(indirect.electricity.emission)} tCO₂e</Typography>
                </Box>
                <Typography sx={formulaSx}>{indirect.electricity.formula}</Typography>
              </Box>
            )}
            {indirect?.heat && (
              <Box sx={itemRowSx}>
                <Box sx={labelValueRowSx}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>净外购热力 (Crl):</Typography>
                  <Typography sx={valueSx}>{formatVal(indirect.heat.emission)} tCO₂e</Typography>
                </Box>
                <Typography sx={formulaSx}>{indirect.heat.formula}</Typography>
              </Box>
            )}
            <Box
              sx={{
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px dashed ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>间接排放小计 (Cjj)</Typography>
              <Typography sx={{ ...valueSx, color: theme.palette.text.primary }}>{formatVal(indirect?.indirectTotal)} tCO₂e</Typography>
            </Box>
            </AccordionDetails>
          </Accordion>

          {/* 绿地碳汇（扣减项） */}
          {greenSink && (
            <Accordion expanded={expanded.greenSink} onChange={handleAccordionChange('greenSink')} sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}>
                <Typography sx={sectionTitleSx}>绿地碳汇（扣减）</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                <Box sx={{ pl: 1 }}>
                  {(greenSink.items || []).map((item) => (
                    <Box key={item.label} sx={itemRowSx}>
                      <Box sx={labelValueRowSx}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.label}:</Typography>
                        <Typography sx={{ ...valueSx, color: 'success.main' }}>{formatVal(item.emission)} tCO₂e</Typography>
                      </Box>
                      <Typography sx={formulaSx}>{item.formula}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>绿地碳汇小计</Typography>
                  <Typography sx={{ ...valueSx, color: 'success.main' }}>{formatVal(greenSink.total)} tCO₂e</Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* 总计 */}
          <Paper
            variant="outlined"
            sx={{
              ...paperSx,
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
              backgroundColor: isDark ? 'rgba(102,187,106,0.08)' : 'rgba(102,187,106,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.15rem' }, color: theme.palette.primary.main }}>
                ★ 碳排放总计 (Cz) = 直接排放 + 间接排放 − 绿地碳汇
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontSize: '0.85rem', color: theme.palette.text.secondary }}>
                {formatVal(direct?.directTotal)} + {formatVal(indirect?.indirectTotal)} − {formatVal(totalGreenSink ?? 0)} = {formatVal(totalEmissions)} tCO₂e
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.35rem' }, color: theme.palette.primary.main, fontVariantNumeric: 'tabular-nums' }}>
                {formatVal(totalEmissions)} tCO₂e
              </Typography>
              </Box>
            </Box>
          </Paper>

          {/* 强度指标 */}
          <Accordion expanded={expanded.intensity} onChange={handleAccordionChange('intensity')} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}>
              <Typography sx={sectionTitleSx}>碳排放强度指标</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            {intensity?.byArea && (
              <Box sx={itemRowSx}>
                <Box sx={labelValueRowSx}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>单位建筑面积碳排放 (CM):</Typography>
                  <Typography sx={valueSx}>{formatVal(intensity.byArea.value)} tCO₂e/m²</Typography>
                </Box>
                <Typography sx={formulaSx}>{intensity.byArea.formula}</Typography>
              </Box>
            )}
            {intensity?.byPerson && (
              <Box sx={itemRowSx}>
                <Box sx={labelValueRowSx}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>人均碳排放 (CR):</Typography>
                  <Typography sx={valueSx}>{formatVal(intensity.byPerson.value)} tCO₂e/人</Typography>
                </Box>
                <Typography sx={formulaSx}>{intensity.byPerson.formula}</Typography>
              </Box>
            )}
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          py: 2,
          px: 3,
          borderTop: `1px solid ${theme.palette.divider}`,
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isSubmitting}
          startIcon={<EditOutlinedIcon />}
          sx={{ minWidth: { xs: '100%', sm: 130 } }}
        >
          返回修改
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={isSubmitting}
          startIcon={isSubmitting ? null : <CheckCircleOutlinedIcon />}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
        >
          {isSubmitting ? '提交中...' : confirmLabel}
        </Button>
      </Box>
    </Dialog>
  );
};

export default EmissionPreviewModal;
