import { queryClient } from "#lib/query/index.js";
import { queryKeys } from "#lib/query/keys.js";
import { Tag } from '#src/types/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

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
    let dbTags: Tag[] = [];
    
    if (existingTags && existingTags.length > 0) {
      dbTags = existingTags;
    } else {
      // Fetch tags directly from API since queries.ts is being removed
      const tagsData = await ErrorFactory.unwrap<Tag[]>(
        api.tags.$get(),
        'Failed to fetch tags'
      );
      
      dbTags = (tagsData || []).map(t => ({
        ...t,
        name: (t.name || '').toUpperCase(),
        // Support both string and number IDs safely, avoid Number() conversion that breaks UUIDs
        id: t.id
      })) as unknown as Tag[];
    }

    const tagIds: string[] = [];
    const missingNames: string[] = [];

    const normalizedTagNames = tagNames
      .map(n => {
        if (!n) return '';
        if (typeof n === 'object') {
          const raw = n as Record<string, unknown>;
          return String(raw.name || raw.zh || raw.en || '').toUpperCase().trim();
        }
        return String(n).toUpperCase().trim();
      })
      .filter(Boolean);
    
    const uniqueNames = Array.from(new Set(normalizedTagNames));

    uniqueNames.forEach(name => {
      const existing = dbTags.find((t: Tag) => 
        (String(t.id) === name) || (t.name && t.name.toUpperCase() === name) || 
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
        // Batch create tags directly using API
        const createdTags = await ErrorFactory.unwrap<Tag[]>(
          api.tags.batch.$post({
            json: { 
              tags: missingNames.map(name => ({ name: name.toUpperCase().trim() })) 
            }
          }),
          'Batch tag creation failed'
        );

        if (Array.isArray(createdTags)) {
          createdTags.forEach((t: Tag) => {
            if (t.id) tagIds.push(String(t.id));
          });
        }
        
        // Invalidate tags cache so the UI shows the newly created tags
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      } catch (e) {
        ErrorFactory.handle(e, { context: 'resolveTagNamesToIds-batch', silent: true });
      }
    }

    return tagIds;
  } catch (err) {
    throw ErrorFactory.fatal((err as Error).message || '標籤解析失敗', { context: 'resolveTagNamesToIds' });
  }
}
