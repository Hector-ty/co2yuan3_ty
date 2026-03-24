import { formSections } from '../components/formFields';
import { formatNumber } from './formatNumber';

const getNestedValue = (obj, path) =>
  path.reduce((o, k) => (o != null && typeof o[k] !== 'undefined' ? o[k] : undefined), obj);

const FUGITIVE_THRESHOLDS = {
  'HCFC-22': 1.29,
  'HFC-32': 3.27,
  'HFC-125': 0.67,
  'HFC-143a': 0.43,
  'HFC-245fa': 2.62,
  CO2: 2.52,
  'HFC-227ea': 23.33,
};

/**
 * 根据表单 values、排放因子、用户信息，计算预览数据（含公式与结果）.
 * 与 DataEntryForm 的 calculateEmission 及服务端 calculationEngine 逻辑一致.
 */
export function computeEmissionPreview(values, emissionFactors, user = null) {
  const buildingArea = user && (user.buildingArea != null) ? Number(user.buildingArea) : null;
  const personnelCount = user && (user.personnelCount != null) ? Number(user.personnelCount) : null;

  const fossilItems = [];
  let fossilTotal = 0;
  const fugitiveItems = [];
  let fugitiveTotal = 0;
  let electricityEmission = 0;
  let heatEmission = 0;
  let electricityFormula = '未填报';
  let heatFormula = '未填报';

  const fmt = (n) => (n != null && !Number.isNaN(n) ? formatNumber(n) : '—');

  // 化石燃料：固体、液体、气体
  const fossilSection = formSections[0];
  if (fossilSection?.panels) {
    for (const panel of fossilSection.panels) {
      const isGas = panel.key === '1-3';
      for (const field of panel.fields) {
        const val = Number(getNestedValue(values, field.name)) || 0;
        const [cat, type, fuel] = field.name;
        const factors = emissionFactors[type];
        const factor = factors?.[fuel];
        let emission = 0;
        let formula = '';
        if (factor != null && factor !== '' && val > 0) {
          if (isGas) {
            emission = (val / 10000) * factor;
            formula = `消耗量(${fmt(val)} m³)/10000 × 排放因子(${fmt(factor)} tCO₂/万Nm³) = ${fmt(emission)} tCO₂e`;
          } else {
            emission = val * factor;
            formula = `消耗量(${fmt(val)} t) × 排放因子(${fmt(factor)} tCO₂/t) = ${fmt(emission)} tCO₂e`;
          }
        } else if (val > 0) {
          formula = `消耗量 ${fmt(val)}，缺少排放因子`;
        } else {
          formula = '未填报';
        }
        fossilItems.push({ label: field.label, emission, formula });
        fossilTotal += emission;
      }
    }
  }

  // 逸散排放：空调、灭火
  const fugitiveSection = formSections[1];
  if (fugitiveSection?.panels && emissionFactors.fugitive) {
    for (const panel of fugitiveSection.panels) {
      for (const field of panel.fields) {
        const val = Number(getNestedValue(values, field.name)) || 0;
        const gasName = field.name[2];
        const factor = emissionFactors.fugitive[gasName];
        const threshold = FUGITIVE_THRESHOLDS[gasName];
        let emission = 0;
        let formula = '';
        if (factor != null && factor !== '' && val > 0) {
          if (threshold != null && val < threshold) {
            formula = `输入值(${fmt(val)} kg) < 阈值(${formatNumber(threshold)} kg)，不计入`;
          } else {
            emission = val * factor;
            formula = `输入值(${fmt(val)} kg) × 排放因子(${fmt(factor)}) = ${fmt(emission)} tCO₂e`;
          }
        } else if (val > 0) {
          formula = `输入值 ${fmt(val)}，缺少排放因子`;
        } else {
          formula = '未填报';
        }
        fugitiveItems.push({ label: field.label, emission, formula });
        fugitiveTotal += emission;
      }
    }
  }

  // 间接排放：电力、热力
  const indirectSection = formSections[2];
  if (indirectSection?.fields && emissionFactors.indirect) {
    const elecVal = Number(getNestedValue(values, ['indirectEmissions', 'purchasedElectricity'])) || 0;
    const heatVal = Number(getNestedValue(values, ['indirectEmissions', 'purchasedHeat'])) || 0;
    const efElec = emissionFactors.indirect.electricity;
    const efHeat = emissionFactors.indirect.heat;
    if (efElec != null && efElec !== '') {
      electricityEmission = elecVal * 10 * efElec;
      electricityFormula =
        `净外购电量(${fmt(elecVal)} 10⁴kWh) × 10 × 排放因子(${fmt(efElec)} tCO₂/MWh) = ${fmt(electricityEmission)} tCO₂e`;
    } else if (elecVal > 0) {
      electricityFormula = `净外购电量 ${fmt(elecVal)}，缺少排放因子`;
    } else {
      electricityFormula = '未填报';
    }
    if (efHeat != null && efHeat !== '') {
      heatEmission = heatVal * efHeat;
      heatFormula =
        `净外购热力(${fmt(heatVal)} GJ) × 排放因子(${fmt(efHeat)} tCO₂e/GJ) = ${fmt(heatEmission)} tCO₂e`;
    } else if (heatVal > 0) {
      heatFormula = `净外购热力 ${fmt(heatVal)}，缺少排放因子`;
    } else {
      heatFormula = '未填报';
    }
  }

  // 绿地碳汇（扣减项）
  const greenSinkSection = formSections[3];
  const greenSinkItems = [];
  let totalGreenSink = 0;
  const greenSinkFactors = emissionFactors.greenSink || { tree: 0.25, shrub: 0.1, herb: 0.05 };
  if (greenSinkSection?.fields) {
    for (const field of greenSinkSection.fields) {
      const val = Number(getNestedValue(values, field.name)) || 0;
      const veg = field.name[1]; // tree, shrub, herb
      const factor = greenSinkFactors[veg] ?? { tree: 0.25, shrub: 0.1, herb: 0.05 }[veg];
      const sink = factor != null && val > 0 ? val * factor : 0;
      greenSinkItems.push({
        label: field.label,
        emission: sink,
        formula: val > 0 && factor != null
          ? `${field.label}(${fmt(val)} 亩) × ${fmt(factor)} tCO₂e/亩·年 = ${fmt(sink)} tCO₂e`
          : '未填报',
      });
      totalGreenSink += sink;
    }
  }

  const directTotal = fossilTotal + fugitiveTotal;
  const indirectTotal = electricityEmission + heatEmission;
  const totalEmissions = Math.max(0, directTotal + indirectTotal - totalGreenSink);

  const byAreaValue =
    buildingArea != null && buildingArea > 0 ? totalEmissions / buildingArea : null;
  const byPersonValue =
    personnelCount != null && personnelCount > 0 ? totalEmissions / personnelCount : null;
  const byAreaFormula =
    buildingArea != null && buildingArea > 0
      ? `总排放量(${fmt(totalEmissions)} tCO₂e) / 建筑面积(${fmt(buildingArea)} m²) = ${fmt(byAreaValue)} tCO₂e/m²`
      : '未提供建筑面积，无法计算';
  const byPersonFormula =
    personnelCount != null && personnelCount > 0
      ? `总排放量(${fmt(totalEmissions)} tCO₂e) / 人员数量(${fmt(personnelCount)} 人) = ${fmt(byPersonValue)} tCO₂e/人`
      : '未提供人员数量，无法计算';

  return {
    direct: {
      fossilFuels: { total: fossilTotal, items: fossilItems },
      fugitive: { total: fugitiveTotal, items: fugitiveItems },
      directTotal,
    },
    greenSink: { total: totalGreenSink, items: greenSinkItems },
    indirect: {
      electricity: { emission: electricityEmission, formula: electricityFormula },
      heat: { emission: heatEmission, formula: heatFormula },
      indirectTotal,
    },
    totalEmissions,
    totalGreenSink,
    intensity: {
      buildingArea,
      personnelCount,
      byArea: { value: byAreaValue, formula: byAreaFormula },
      byPerson: { value: byPersonValue, formula: byPersonFormula },
    },
  };
}
