import { type Type } from 'arktype';

/**
 * ArkType 適配器，讓 el-form-react-hooks 正確解析錯誤路徑與訊息
 */
export function arktypeValidator<T>(schema: Type<T>) {
  return (values: unknown) => {
    const result = schema(values);
    
    if (result instanceof Error) {
      // ArkType 的錯誤通常是一個數組或樹狀結構
      // 這裡簡單提取所有錯誤訊息，el-form 需要 [path]: message 格式
      const errors: Record<string, string> = {};
      
      // 遍歷 ArkType 的具體錯誤位元（如果存在）
      if ('errors' in result && Array.isArray(result.errors)) {
        result.errors.forEach((err: any) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = err.message;
          }
        });
      } else {
        // Fallback: 只有單一錯誤訊息時
        errors['_root'] = result.message;
      }
      
      return errors;
    }
    
    return null;
  };
}
