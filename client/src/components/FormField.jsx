import React, { memo } from 'react';
import { Grid, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

// 独立的表单字段组件，使用memo优化，避免不必要的重新渲染
const FormField = memo(({ 
  name, 
  control, 
  label, 
  unitLabel,
  ...props 
}) => {
  // 添加安全检查 - 确保始终返回有效的React元素
  if (!name || !control) {
    console.warn('FormField: name or control is missing', { name, control });
    // 返回一个占位符元素而不是null，避免React错误#300
    return (
      <Grid item xs={12} sm={6} md={4}>
        <div style={{ display: 'none' }} />
      </Grid>
    );
  }
  
  // 直接返回 Controller，React 的错误边界会处理渲染错误
  // 注意：不能在组件渲染函数中使用 try-catch 包裹 JSX 返回
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Controller
        name={name}
        control={control}
        defaultValue={0} // 添加默认值，防止未注册字段错误
        shouldUnregister={false} // 保持字段注册
        render={({ field, fieldState }) => {
          // 确保 field 对象存在
          if (!field) {
            console.warn(`FormField: field object is missing for ${name}`);
            return (
              <TextField
                value=""
                onChange={() => {}}
                type="text"
                label={`${label || ''}${unitLabel || ''}`}
                fullWidth
                variant="outlined"
                size="small"
                disabled
                InputProps={{
                  inputProps: { 
                    inputMode: 'decimal'
                  }
                }}
                {...props}
              />
            );
          }
          
          // 显示：空或 0 时输入框显示为空，不显示 "0"（删掉值后模块内什么都没有）
          const displayValue = (field.value === '' || field.value == null || field.value === 0)
            ? ''
            : (typeof field.value === 'number' && isFinite(field.value) ? field.value : Number(field.value) || '');
          
          return (
            <TextField
              {...field}
              value={displayValue}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  field.onChange('');
                } else {
                  const num = Number(raw);
                  field.onChange(isFinite(num) ? num : raw);
                }
              }}
              onBlur={field.onBlur}
              type="text"
              label={`${label || ''}${unitLabel || ''}`}
              fullWidth
              variant="outlined"
              size="small"
              error={!!fieldState?.error}
              helperText={fieldState?.error?.message}
              InputProps={{
                inputProps: { 
                  inputMode: 'decimal'
                }
              }}
              {...props}
            />
          );
        }}
      />
    </Grid>
  );
});

FormField.displayName = 'FormField';

export default FormField;
