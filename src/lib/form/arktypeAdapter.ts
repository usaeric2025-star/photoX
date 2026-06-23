import { type Type } from 'arktype';

/**
 * ArkType 適配器，讓 el-form-react-hooks 正確解析錯誤路徑與訊息
 */
export function arktypeValidator<T>(schema: Type<T>) {
  return (values: unknown) => {
    const result = schema(values);
    
    // If it's a success, result should contain 'data'.
    // If it's a failure (ArkType v2+), it usually returns something without 'data' or with 'problems'.
    
    // ArkType v2 API behavior: schema(values) returns result, which can be checked.
    // If it failed, result.problems will be defined.
    
    const problems = (result as any)?.problems; 
    
    if (problems) {
      const errors: Record<string, string> = {};
      
      // ArkType problems are iterable
      for (const problem of problems) {
        const path = problem.path.join('.');
        if (!errors[path]) {
          errors[path] = problem.message;
        }
      }
      
      return errors;
    }
    
    return null;
  };
}
