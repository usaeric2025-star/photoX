import { AutoFormFieldConfig } from 'el-form-react-components';
import type { Type } from 'arktype';

export function arktypeToElForm<T extends Record<string, unknown>>(
  schema: Type<T>
): AutoFormFieldConfig[] {
  // 將 ArkType Schema 轉換為 El Form 可接受的格式
  // 此處目前為空實作，需根據具體需求解析 keys
  return [];
}
