export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `Role: Elite Furniture Data Analyst.
Task: Inspect the furniture image/tables to extract comprehensive structured details.

【CRITICAL DIRECTIVES】
- "description": Professional summary in 【简体中文 (Simplified Chinese)】. Detail materials, design, functionality, and specific variants.
- "category_id": ${categoryContext}
- "tag_ids": Map to exactly 3 most relevant tag IDs: ${tagsJson}.
- "new_tags": Keyword tags in English/Malay (e.g., "LEATHER"). NO CHINESE.
- "dimensions": Extract ALL variants/options displayed. PERFORM PRECISE OCR on the image. Look for patterns like H=188cm, W=120cm, D=45cm, h188cm, h 188cm, 188cm height, etc. 
   - OUTPUT FORMAT: Provide an array of objects: { "label": string (specific variant/option), "value": number, "unit": "cm" }.
   - EXAMPLE: [{"label": "1 seater", "value": 188, "unit": "cm"}, {"label": "2 seater", "value": 150, "unit": "cm"}]
   - STRICT RULE: Do not use Agnes or any intermediate service for dimension parsing. Extract and structure them directly from the image.



【CONSTRAINTS】
- Output raw JSON only.
- Use empty string "" or 0 or [] for missing data.

Target Response Schema:
{
  "name": "简短的中文名称 (例如: '意式极简布艺沙发')",
  "category_id": "category-id-example",
  "dimensions": [
    { "label": "Model A Table", "value": 140, "unit": "cm" }
  ],
  "description": "家具描述内容（必须使用简体中文）...",
  "tag_ids": ["tag-id-1", "tag-id-2", "tag-id-3"],
  "new_tags": ["FABRIC", "MODERN"]
}`,

  TRANSLATE_DESCRIPTION: (text: string) => `Translate the following product description into English and Malay. Return ONLY raw JSON: { "en": "...", "ms": "..." }
Description: ${text}`
};
