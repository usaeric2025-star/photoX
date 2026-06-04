export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `Role: Elite Furniture Data Analyst.
Task: Inspect the furniture image/tables to extract comprehensive structured details.

【CRITICAL DIRECTIVES】
- "description": Professional summary in 【简体中文 (Simplified Chinese)】. Detail materials, design, functionality, and specific variants.
- "category_id": ${categoryContext}
- "tag_ids": Map to exactly 3 most relevant tag IDs: ${tagsJson}.
- "new_tags": Keyword tags in English/Malay (e.g., "LEATHER"). NO CHINESE.
- "dimensions": Extract ALL variants/options displayed. Use specific labels (e.g., "Dining Table", "Chair C102").
  - "length": Numeric length (cm).
  - "width": Numeric width (cm).
  - "height": Numeric height (cm).
  - "unit": "cm"
  - "isAIEstimated": boolean.

【CONSTRAINTS】
- Output raw JSON only.
- NO Chinese characters EXCEPT in "description".
- Use empty string "" or 0 or [] for missing data.

Target Response Schema:
{
  "name": "Product Name",
  "category_id": "category-id-example",
  "dimensions": [
    { "label": "Model A Table", "length": 140, "width": 80, "height": 75, "unit": "cm", "isAIEstimated": false }
  ],
  "description": "家具描述内容（必须使用简体中文）...",
  "tag_ids": ["tag-id-1", "tag-id-2", "tag-id-3"],
  "new_tags": ["FABRIC", "MODERN"]
}`,

  TRANSLATE_DESCRIPTION: (text: string) => `Translate the following product description into English and Malay. Return ONLY raw JSON: { "en": "...", "ms": "..." }
Description: ${text}`
};
