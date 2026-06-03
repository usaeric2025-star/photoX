export const AI_PROMPTS = {
  ANALYZE_PRODUCT: (categoryContext: string, tagsJson: string) => `Role: Elite Multi-Language Furniture Data Analyst & Translator.
Task: Meticulously inspect every portion of the furniture image and tables to extract comprehensive structured product details with high-precision values and full-scale translations.

【CRITICAL DIRECTIVE: DETECT ALL ITEMS & VARIANTS】
- Do not skip ANY item, row, table, variant, seat, or listed model number/size in the image or drawing! 
- If multiple items, custom sizes, drawers, side cabinets, dining chairs, tables, or models are listed or drawn together, you MUST isolate and extract EACH distinct variant as a separate object in the "dimensions" array.
- Look at both textual specifications and visual layout to find all elements! Avoid dropping details or giving incomplete results.

【CORE DATA FIELDS (STRICTLY USE snake_case ONLY)】
- "name": Highly descriptive product series identifier or brand name (e.g., "Mero Modern Dining Table Set"). If explicitly specified in the image text, prioritize that wording exactly. Otherwise, generate an elegant name.
- "model_number": SKU/Serial/Model code(s). If multiple models appear or are mentioned in the image, join them with "/" (e.g., "C101/C102/C103"). Never miss any model numbers!
- "price": Numeric estimated or listed price. Default to 0.
- "description": Professional summary in 【简体中文 (Simplified Chinese)】. Detail materials, design, functionality, and distinguish any multiple variants/sizes/options.
- "description_translations": A REQUIRED object containing complete, professional descriptions in different languages translating the primary Chinese "description":
  - "zh": Summary in 【简体中文 (Simplified Chinese)】 (should be identical to the main "description" field).
  - "en": Fluent, natural summary in 【English】.
  - "ms": Fluent, natural summary in 【Bahasa Melayu】.
- "category_id": ${categoryContext} (For matching, consider the English definition and names heavily first. Prioritize English classification alignment).
- "tag_ids": Map to exactly 3 most relevant tag IDs from this list: ${tagsJson}. Filter down or fill up to ensure EXACTLY 3 tags are selected.
- "new_tags": If no existing tags fit, create 1-3 new keyword tags in English/Malay (e.g., "LEATHER", "RATTAN"). NO CHINESE.

【SPECIFICATION RULES (DIMENSIONS - 以图为准，否AI估算，杜绝 OVERALL)】
- "dimensions": A REQUIRED array of objects.
- MUST reflect ALL variants, options, models, drawers, tables, or units displayed.
- "不要overall" RESTRICTION: You are STRICTLY FORBIDDEN from using generic/lazy labels such as "Overall", "overall", "Overall Size", "Overall Dimension", "Total", or similar terms for any dimension's label!
- Label Wording Rules: 
  - ALWAYS name the actual specific item or configuration (e.g., "Dining Table", "3-Seater Sofa", "Study Chair", "Executive Desk", "Left Side Drawer", "C102 Office Chair").
  - If a dimension is explicitly labeled with a model or name in the image, use that name (e.g., "Model M1 Table").
- Image Text Priority: If measurements or drawings are explicitly written in text in the image, extract them precisely!
- AI Estimation Fallback: If measurements are NOT written in text inside the image, you MUST visually estimate/guess typical sizes (Length, Width, Height) in centimeters based on standard real-life dimensions of such furniture. Set "isAIEstimated": true, and append " (AI)" to the descriptive label (e.g., "Chair (AI)"). NEVER output zero values or leave "dimensions" empty!
- Dimension fields per object:
  - "label": Descriptive specific label honoring the constraints above.
  - "length": Numeric length in centimeters (numeric only).
  - "width": Numeric width in centimeters (numeric only).
  - "height": Numeric height in centimeters (numeric only).
  - "unit": "cm"
  - "isAIEstimated": boolean (true if estimated by you, false if written on the image).

【CONSTRAINTS】
- Output raw JSON only. NO Markdown code blocks (\`\`\`json).
- NO Chinese characters in any field EXCEPT "description" and "description_translations.zh".
- Use empty string "" or 0 or [] for missing data - NEVER null.

Target Response Schema:
{
  "name": "Product Name",
  "model_number": "ModelA/ModelB",
  "category_id": "category-id-example",
  "dimensions": [
    { "label": "Model A Table", "length": 140, "width": 80, "height": 75, "unit": "cm", "isAIEstimated": false },
    { "label": "Model B Chair (AI)", "length": 55, "width": 55, "height": 90, "unit": "cm", "isAIEstimated": true }
  ],
  "description": "Chinese text of description...",
  "description_translations": {
    "zh": "Chinese text of description...",
    "en": "English professional description...",
    "ms": "Malay professional description..."
  },
  "tag_ids": ["tag-id-1", "tag-id-2", "tag-id-3"],
  "new_tags": ["FABRIC", "MODERN"]
}`,

  TRANSLATE_DESCRIPTION: (text: string) => `Translate the following product description into English and Malay. Return ONLY raw JSON: { "en": "...", "ms": "..." }
Description: ${text}`
};
