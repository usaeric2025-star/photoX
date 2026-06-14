import { Tag } from '@/types';
import { loadTagsFromCloud } from './queries';
import { batchCreateTags } from './commands';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * 標籤自動補全與映射服務
 * 將 AI 返回的名稱列表轉換為數據庫 ID 列表，不存在的自動創建
 */
export async function resolveTagNamesToIds(
  tagNames: string[], 
  existingTags?: Tag[]
): Promise<string[]> {
  if (!tagNames || tagNames.length === 0) return [];

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
      try {
        const createResult = await batchCreateTags(missingNames);
        if (createResult) {
          createResult.forEach((id: string) => tagIds.push(id));
        }
      } catch (e) {}
    }

    return tagIds;
  } catch (err) {
    throw ErrorFactory.fatal((err as Error).message || '標籤解析失敗', { context: 'resolveTagNamesToIds' });
  }
}
