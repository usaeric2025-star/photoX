import { AutoFormFieldConfig } from 'el-form-react-components';
import type { Type } from 'arktype';

/**
 * Production-ready adapter that converts ArkType object schemas to ElForm field configurations.
 * Handles basic typing, optionality, and naming conventions.
 */
export function arktypeToElForm<T extends Record<string, unknown>>(
  schema: Type<T>
): AutoFormFieldConfig[] {
  // We use the internal definition structure safely. 
  // In ArkType v2, object properties are available in the 'inner' or 'definition' based on build version.
  const definition = (schema as any).definition || (schema as any).json;
  
  if (!definition || typeof definition !== 'object') {
    return [];
  }

  return Object.entries(definition).map(([key, val]) => {
    // ArkType uses 'key?' for optional fields
    const cleanKey = key.replace(/\?$/, '');
    const isOptional = key.endsWith('?');
    
    const valStr = String(val);

    // Basic type mapping for ElForm
    let type: AutoFormFieldConfig['type'] = 'text';
    
    if (valStr.includes('number')) {
      type = 'number';
    } else if (valStr.includes('boolean')) {
      type = 'checkbox';
    } else if (valStr.includes('string')) {
      // Suggest textarea for known long-text fields
      if (cleanKey.includes('description') || cleanKey.includes('note') || cleanKey.includes('content')) {
        type = 'textarea';
      } else {
        type = 'text';
      }
    } else if (valStr.includes('object') || valStr.includes('{')) {
      // For complex objects, fallback to text or keep as is if ElForm supports JSON
      type = 'text';
    }

    return {
      name: cleanKey,
      label: formatLabel(cleanKey),
      type,
      required: !isOptional,
    };
  });
}

/**
 * Formats a technical key name into a human-readable label.
 * e.g., 'model_number' -> 'Model Number'
 */
function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
