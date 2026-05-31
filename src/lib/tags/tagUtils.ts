import { Tag } from '@/types';
import { batchCreateTags } from '@/services/tag/commands';

/**
 * 标签排序算法：
 * 1. 推荐（Pinned）优先
 * 2. 使用次数（hotScore）降序
 * 3. 名称（name/zh）升序（保持同频波动下的确定性）
 * 
 * 稳定性设计：
 * - 不使用随机数
 * - 使用次数是物理指标，变化缓慢
 * - 只有当多个标签“平手”时，名称排序确保位置固定
 */
export const sortTagsByPopularity = (tags: Tag[]): Tag[] => {
  return [...tags].sort((a, b) => {
    // 1. 推荐状态
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    // 2. 使用频率 (桶排序思想：如果需要更稳定，可以按每10次一个台阶归类)
    const countA = a.hot_score || 0;
    const countB = b.hot_score || 0;
    if (countA !== countB) return countB - countA;

    // 3. 确定性降级（字母序）
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'zh-CN');
  });
};

/**
 * 批量解析标签名到 ID
 * 如果标签不存在则自动创建
 */
export const resolveTagIdsBatch = async (
  names: string[], 
  existingTags: Tag[], 
  tagNameToIdMap: Map<string, string>
): Promise<string[]> => {
  const resultIds: string[] = [];
  const namesToCreate: string[] = [];
  
  const uniqueNames = Array.from(new Set(names.map(n => String(n || '').trim()).filter(Boolean)));

  for (const name of uniqueNames) {
    const uppercaseName = name.toUpperCase();
    
    // 1. Direct ID match: If the item is already a valid tag ID in existingTags
    const directIdMatch = existingTags.find(t => String(t.id) === name);
    if (directIdMatch) {
      resultIds.push(directIdMatch.id);
      continue;
    }

    // 2. Index ID fallback: If AI provides the numeric array index (e.g. 0, 1) rather than Name/ID
    const isNum = /^\d+$/.test(name);
    if (isNum) {
      const idx = parseInt(name, 10);
      if (idx >= 0 && idx < existingTags.length) {
        const matchedTagByIndex = existingTags[idx];
        if (matchedTagByIndex) {
          resultIds.push(matchedTagByIndex.id);
          continue;
        }
      }
    }

    // 3. Lookup via cache / map
    let id = tagNameToIdMap.get(uppercaseName);
    
    // 4. Lookup via existing list by Name
    if (!id) {
      const found = existingTags.find(t => 
        (t.name || '').toUpperCase() === uppercaseName
      );
      if (found) id = found.id;
    }
    
    if (id) {
      resultIds.push(id);
    } else {
      // Avoid creating dummy or numeric tags like "0", "1", "2"
      if (!isNum && name.length > 1) {
        namesToCreate.push(name);
      }
    }
  }
  
  // 3. Batch create missing tags
  if (namesToCreate.length > 0) {
    try {
      const newTagsMap = await batchCreateTags(namesToCreate);
      newTagsMap.forEach(id => resultIds.push(id));
    } catch (err) {
      console.error('Failed to resolve tags batch:', err);
    }
  }
  
  return Array.from(new Set(resultIds));
};
