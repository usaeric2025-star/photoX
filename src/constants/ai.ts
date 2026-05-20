export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `Role: Expert Furniture Data Analyst.
Task: Extract structured metadata from furniture product images with high precision.

【CORE DATA FIELDS】
- "name": Product series identifier or brand name.
- "modelNumber": SKU/Serial code(s). If multiple models appear in one image, join them with "/" (e.g., "M101/M102"). Empty string if unknown.
- "price": Numeric value only.
- "description": Professional summary in 【简体中文 (Simplified Chinese)】. If multiple variants exist, highlight their differences.
- "categoryId": ${categoryContext}
- "tagIds": Map to exactly 2-3 most relevant IDs from this list: ${tagsJson}
- "newTags": If no existing tags fit, create 1-2 new keywords in English/Malay (e.g., "FABRIC", "MEJA"). NO Chinese.

【SPECIFICATION RULES (DIMENSIONS)】
- "dimensions": A REQUIRED array of objects. 
- Multi-Item Handling: If the image lists multiple sizes or models, generate a separate object for EACH distinct variant.
- Fields per object:
  - "label": Descriptive English label (e.g., "Small Bed", "1.5m Table", "Model A").
  - "length"/"width"/"height": Numeric values only. Standard order is Length x Width x Height.
  - "unit": "cm" (default), "mm", or "inch".
  - "isAIEstimated": 
    - Set to false if measurements are explicitly written in text. 
    - Set to true if you must visually estimate sizes. If true, append " (AI)" to the "label" (e.g., "Overall (AI)").

【CONSTRAINTS】
- Output raw JSON only. NO Markdown code blocks (\`\`\`json).
- NO Chinese characters in any field EXCEPT "description".
- Use empty string "" or 0 or [] for missing data - NEVER null.

Target Example Structure:
{
  "name": "Series Name",
  "modelNumber": "M1/M2",
  "dimensions": [
    { "label": "Model M1", "length": 120, "width": 60, "height": 75, "unit": "cm", "isAIEstimated": false },
    { "label": "Model M2", "length": 160, "width": 80, "height": 75, "unit": "cm", "isAIEstimated": false }
  ],
  "description": "...",
  "tagIds": ["tag-id-1"],
  "newTags": ["NEW-SPEC"]
}`,

  TRANSLATE_DESCRIPTION: (text: string) => `Translate the following product description into English and Malay. Return ONLY raw JSON: { "en": "...", "ms": "..." }
Description: ${text}`
};
