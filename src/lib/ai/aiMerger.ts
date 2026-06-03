import { Photo } from '@/types';

/**
 * Merges AI analysis results into an existing photo object.
 * @param original The current photo object
 * @param aiResult The result from AI analysis
 * @param preserveFields Fields that should NOT be overwritten if they already have values
 */
export function applyAIResult(
  original: any,
  aiResult: any,
  options: {
    preserveFields?: string[];
    categories?: { id: string; name: string; zh?: string; en?: string }[];
    tags?: { id: string; name: string }[];
  } = {}
): any {
  const { preserveFields = [], categories = [], tags = [] } = options;
  const result: any = { ...original };

  const setIfEmpty = (field: string, value: any) => {
    if (!value) return;
    const current = original[field];
    const isEmpty = !current || (Array.isArray(current) && current.length === 0);
    
    if (preserveFields.includes(field) && !isEmpty) {
      return;
    }
    result[field] = value;
  };

  // Direct mappings
  setIfEmpty('name', aiResult.name);
  setIfEmpty('description', aiResult.description);
  setIfEmpty('item_code', aiResult.item_code);
  setIfEmpty('model_number', aiResult.model_number);
  setIfEmpty('manual_code', aiResult.manual_code);
  setIfEmpty('materials', aiResult.materials);
  setIfEmpty('colors', aiResult.colors);

  // Translations
  if (aiResult.name_en) setIfEmpty('name_en', aiResult.name_en);
  if (aiResult.name_ms) setIfEmpty('name_ms', aiResult.name_ms);
  
  if (aiResult.description_en || aiResult.description_ms) {
    result.description_translations = {
      ...original.description_translations,
      zh: aiResult.description || original.description || '',
      en: aiResult.description_en || (original.description_translations?.en || ''),
      ms: aiResult.description_ms || (original.description_translations?.ms || '')
    };
  }

  // Category Resolution
  if (aiResult.category && categories.length > 0) {
    const cat = categories.find(c => 
      c.name.toLowerCase() === aiResult.category.toLowerCase() || 
      c.en?.toLowerCase() === aiResult.category.toLowerCase() ||
      c.zh?.toLowerCase() === aiResult.category.toLowerCase()
    );
    if (cat) setIfEmpty('category_id', cat.id);
  }

  // Tags Resolution
  if (Array.isArray(aiResult.tags) && tags.length > 0) {
    const tagIds = aiResult.tags.map((tagName: string) => {
      const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
      return tag?.id;
    }).filter(Boolean);
    
    if (tagIds.length > 0) {
      const currentTags = original.tag_ids || [];
      const combined = Array.from(new Set([...currentTags, ...tagIds]));
      setIfEmpty('tag_ids', combined);
    }
  }

  // Dimensions
  if (Array.isArray(aiResult.dimensions) && aiResult.dimensions.length > 0) {
    setIfEmpty('dimensions', aiResult.dimensions);
  }

  return result;
}
