export const AI_PROMPTS = {
    ANALYZE_PHOTO: (context: any) => `
Analyze this furniture/home decor piece.
Output JSON with:
- name: { en, zh, ms } (Translate name to English, Chinese, and Malay/Bahasa Melayu)
- description: { en, zh, ms } (Translate description to English, Chinese, and Malay/Bahasa Melayu)
- category_id: Choose from available: ${JSON.stringify(context.categories)}
- tag_names: Array of strings from: ${JSON.stringify(context.tags)}
- group_id: One of ${JSON.stringify(context.groups)} if similar exists.
- dimensions: Array of objects if visible or estimable:
  [{ "label": string (e.g. "整体尺寸", "Outer Dimension"), "length": number (in cm, length or depth, e.g. 120), "width": number (in cm, e.g. 60), "height": number (in cm, e.g. 75), "unit": "cm", "is_ai_estimated": boolean (true if estimated, false if extracted from visible text in photo) }]
`,
    ANALYZE_GROUP: (details: string) => `Analyze this group of photos: ${details}`,
    REFINE_PHOTO: (detail: string) => `Refine this photo data: ${detail}`
};
