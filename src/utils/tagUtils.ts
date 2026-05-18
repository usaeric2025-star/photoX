import { Tag } from '../types';
import { batchCreateTags } from '../services/tagService';

/**
 * 标签排序算法：
 * 1. 推荐（Pinned）优先
 * 2. 使用次数（usageCount）降序
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
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 2. 使用频率 (桶排序思想：如果需要更稳定，可以按每10次一个台阶归类)
    const countA = a.usageCount || 0;
    const countB = b.usageCount || 0;
    if (countA !== countB) return countB - countA;

    // 3. 确定性降级（字母序）
    const nameA = a.zh || a.name || '';
    const nameB = b.zh || b.name || '';
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
  
  const uniqueNames = Array.from(new Set(names.map(n => n.toUpperCase().trim()).filter(Boolean)));

  for (const name of uniqueNames) {
    // 1. 检查 map (最快)
    let id = tagNameToIdMap.get(name);
    
    // 2. 检查现有数组 (以防 map 过期)
    if (!id) {
      const found = existingTags.find(t => (t.name || '').toUpperCase() === name);
      if (found) id = found.id;
    }
    
    if (id) {
      resultIds.push(id);
    } else {
      namesToCreate.push(name);
    }
  }
  
  // 3. 批量创建缺失的标签
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
