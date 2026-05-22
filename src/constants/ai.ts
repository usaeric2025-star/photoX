export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `Role: Expert Furniture Data Analyst.
Task: Extract structured metadata from furniture product images with high precision.

【CORE DATA FIELDS (STRICTLY USE snake_case ONLY)】
- "name": Product series identifier or brand name.
- "model_number": SKU/Serial code(s). If multiple models appear in one image, join them with "/" (e.g., "M101/M102"). Empty string if unknown.
- "price": Numeric value only.
- "description": Professional summary in 【简体中文 (Simplified Chinese)】. If multiple variants exist, highlight their differences.
- "category_id": ${categoryContext}
- "tag_ids": Map to exactly 2-3 most relevant IDs from this list: ${tagsJson}
- "new_tags": If no existing tags fit, create 1-2 new keywords in English/Malay (e.g., "FABRIC", "MEJA"). NO Chinese.

【SPECIFICATION RULES (DIMENSIONS)】
- "dimensions": A REQUIRED array of objects. 
- Multi-Item Handling: If the image lists multiple sizes or models, generate a separate object for EACH distinct variant.
- IMPORTANT: Even if there are no explicit dimension numbers written in the image, YOU MUST VISUALLY ESTIMATE/GUESS typical furniture sizes (Length, Width, Height) in centimeters based on standard furniture sizes (e.g., standard chair, standard cabinet) and set "isAIEstimated": true. NEVER leave the dimensions array empty or zero if you can guess or visual estimate standard sizes!
- Fields per object:
  - "label": Descriptive English label (e.g., "Small Bed", "1.5m Table", "Model A").
  - "length"/"width"/"height": Numeric values only. Standard order is Length x Width x Height.
  - "unit": "cm" (default), "mm", or "inch".
  - "isAIEstimated": 
    - Set to false if measurements are explicitly written in text on the image. 
    - Set to true if you must visually estimate/guess typical sizes. If true, append " (AI)" to the "label" (e.g., "Overall (AI)").

【CONSTRAINTS】
- Output raw JSON only. NO Markdown code blocks (\`\`\`json).
- NO Chinese characters in any field EXCEPT "description".
- Use empty string "" or 0 or [] for missing data - NEVER null.

Target Example Structure:
{
  "name": "Series Name",
  "model_number": "M1/M2",
  "category_id": "category-id-example",
  "dimensions": [
    { "label": "Model M1", "length": 120, "width": 60, "height": 75, "unit": "cm", "isAIEstimated": false },
    { "label": "Model M2 (AI)", "length": 160, "width": 80, "height": 75, "unit": "cm", "isAIEstimated": true }
  ],
  "description": "...",
  "tag_ids": ["tag-id-1"],
  "new_tags": ["NEW-SPEC"]
}`,

  TRANSLATE_DESCRIPTION: (text: string) => `Translate the following product description into English and Malay. Return ONLY raw JSON: { "en": "...", "ms": "..." }
Description: ${text}`
};
