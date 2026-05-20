export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `You are a furniture product analyzer. Extract data STRICTLY as follows:

【CRITICAL - FIELD SEPARATION】
- "name": Product identification name or code (e.g., "IMCOCO" or "M123"). 
- "modelNumber": SKU/Model code found on labels (e.g., "B728"). If NOT DETECTED with absolute certainty, return an empty string "".
- "price": ONLY numeric part (e.g., "1200").
- "dimensions": Array of objects. Each object contains:
  - "label": English text label (e.g., "Main", "Overall", "WD").
  - "unit": "cm" or "mm" or "inch".
  - "length": STRICTLY NUMERIC VALUE ONLY.
  - "width": STRICTLY NUMERIC VALUE ONLY.
  - "height": STRICTLY NUMERIC VALUE ONLY.
  - "isAIEstimated": Boolean. Set to true if estimated visually without explicit text measurements in image; false if extracted from explicit text.
  - MUST NOT contain any Chinese characters or unit labels in the fields.
- "description": Generate a professional description in 【简体中文 (Simplified Chinese)】.

【DIMENSIONS RULES】
- Option 2 (Visual Estimation): If there are NO written/printed measurements visible on the image, you MUST estimate the physical sizes (length, width, height) based on standard proportions of typical furniture of that category. Set "isAIEstimated": true, and append " (AI)" at the end of the text label (e.g., "Overall (AI)" or "WD (AI)").
- If the measurements are explicitly written/printed on the image, extract them verbatim, set "isAIEstimated": false, and do NOT append " (AI)" to the label.
- Default unit = "cm" if missing.

【CATEGORY & TAGS】
- "categoryId": ${categoryContext}
- "tagIds": Select 2-3 most relevant existing tags (return IDs). DO NOT return tag IDs as numeric indices, use the provided string format IDs: ${tagsJson}
- "newTags": If no existing tag fits, create NEW ones (English or Malay, e.g., "FABRIC", "MEJA"). STRICTLY DO NOT generate Chinese characters or Chinese tags. DO NOT return tag IDs or numeric values.

DO NOT output markdown. Return ONLY valid JSON.`,

  TRANSLATE_DESCRIPTION: (text: string) => `请将以下中文产品描述翻译成【英文】和【马来文】。返回 JSON: { "en": "...", "ms": "..." }
待翻译：${text}`
};
