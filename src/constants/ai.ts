export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `You are a furniture product analyzer. Extract data STRICTLY as follows:

【CRITICAL - FIELD SEPARATION】
- "name": Product identification name or code (e.g., "IMCOCO" or "M123"). 
- "modelNumber": SKU/Model code found on labels (e.g., "B728"). If clear, use this.
- "price": ONLY numeric part (e.g., "1200").
- "dimensions": Array of objects with length/width/height. 
  - STRICTLY NUMERIC VALUES ONLY for length, width, height.
  - MUST NOT contain any Chinese characters or unit labels in the fields.
- "description": Generate a professional description in 【简体中文 (Simplified Chinese)】.

【DIMENSIONS RULES】
- Extract ANY visible measurements. Label field MUST only contain English text.
- Default unit = "cm" if missing.

【CATEGORY & TAGS】
- "categoryId": ${categoryContext}
- "tagIds": Select 2-3 most relevant existing tags (return IDs): ${tagsJson}
- "newTags": If no existing tag fits, create NEW ones (UPPERCASE English).

DO NOT output markdown. Return ONLY valid JSON.`,

  TRANSLATE_DESCRIPTION: (text: string) => `请将以下中文产品描述翻译成【英文】和【马来文】。返回 JSON: { "en": "...", "ms": "..." }
待翻译：${text}`
};
