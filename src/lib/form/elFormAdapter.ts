import { AutoFormFieldConfig } from 'el-form-react-components';
import type { Type } from 'arktype';

export function arktypeToElForm<T extends Record<string, unknown>>(
  schema: Type<T>
): AutoFormFieldConfig[] {
  // 將 ArkType Schema 轉換為 El Form 可接受的格式
  const definition = schema.definition;
  if (!definition || typeof definition !== 'object') {
    return [];
  }

  return Object.entries(definition).map(([key, val]) => {
    const cleanKey = key.replace(/\?$/, '');
    const isOptional = key.endsWith('?');
    
    // Basic type mapping
    let type: AutoFormFieldConfig['type'] = 'text';
    if (val === 'number') type = 'number';
    if (val === 'boolean') type = 'checkbox';
    if (val === 'string' && (cleanKey.includes('description') || cleanKey.includes('note'))) {
        type = 'textarea';
    }

    return {
      name: cleanKey,
      label: cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1).replace(/_/g, ' '),
      type,
      required: !isOptional,
    };
  });
}
