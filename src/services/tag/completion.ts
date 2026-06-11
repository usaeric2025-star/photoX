import { Tag } from '@/types';
import { loadTagsFromCloud } from './queries';
import { batchCreateTags } from './commands';
import { ok, fail } from '@/lib/utils/result';
import { AppResult } from '@/types/api';

/**
 * 標籤自動補全與映射服務
 * 將 AI 返回的名稱列表轉換為數據庫 ID 列表，不存在的自動創建
 */
export async function resolveTagNamesToIds(
  tagNames: string[], 
  existingTags?: Tag[]
): Promise<AppResult<string[]>> {
  if (!tagNames || tagNames.length === 0) return ok([]);

  try {
    const dbTags = existingTags && existingTags.length > 0 ? existingTags : (await loadTagsFromCloud());
    const tagIds: string[] = [];
    const missingNames: string[] = [];

    const normalizedTagNames = tagNames
      .map(n => {
        if (!n) return '';
        if (typeof n === 'object') {
          return String((n as any).name || (n as any).zh || (n as any).en || '').toUpperCase().trim();
        }
        return String(n).toUpperCase().trim();
      })
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(normalizedTagNames));

    uniqueNames.forEach(name => {
      const existing = dbTags.find((t: Tag) => 
        (t.name && t.name.toUpperCase() === name) || 
        (t.aliases && Array.isArray(t.aliases) && t.aliases.some((a: string) => a.toUpperCase() === name))
      );
      
      if (existing) {
        tagIds.push(String(existing.id));
      } else {
        missingNames.push(name);
      }
    });

    if (missingNames.length > 0) {
      const createResult = await batchCreateTags(missingNames);
      if (createResult.ok && createResult.data) {
        createResult.data.forEach((id: string) => tagIds.push(id));
      }
    }

    return ok(tagIds);
  } catch (err) {
    return fail((err as Error).message || '標籤解析失敗');
  }
}
