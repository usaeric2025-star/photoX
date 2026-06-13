export const AI_PROMPTS = {
    ANALYZE_PHOTO: (context: any) => `
Analyze this furniture/home decor piece.
Output JSON with:
- name: { en, zh, ms } (Translate name to English, Chinese, and Malay/Bahasa Melayu)
- description: { en, zh, ms } (Translate description to English, Chinese, and Malay/Bahasa Melayu)
- category_id: Choose from available: ${JSON.stringify(context.categories)}
- tag_names: Array of up to 3 strings from: ${JSON.stringify(context.tags)}
- group_id: Match this item against the existing groups: ${JSON.stringify(context.groups)}. If similar exists, return ONLY the exact 'id' string (UUID) of that group. If no similar group matches, return null. DO NOT return the full group object, only the string ID or null.
- dimensions: Array of objects if visible or estimable:
  [{ "label": string, "length": number, "width": number, "height": number, "unit": "cm", "is_ai_estimated": boolean }]
  Note: Ensure length, width, and height are numbers.
`,
    ANALYZE_GROUP: (details: string) => `Analyze this group of photos: ${details}`,
    REFINE_PHOTO: (detail: string) => `Refine this photo data: ${detail}`
};
