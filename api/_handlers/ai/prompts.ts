export const AI_PROMPTS = {
    ANALYZE_PHOTO: (context: any) => `
Analyze this furniture/home decor piece.
Output JSON with:
- name: { en, zh }
- description: { en, zh }
- category_id: Choose from available: ${JSON.stringify(context.categories)}
- tag_names: Array of strings from: ${JSON.stringify(context.tags)}
- group_id: One of ${JSON.stringify(context.groups)} if similar exists.
`,
    ANALYZE_GROUP: (details: string) => `Analyze this group of photos: ${details}`,
    REFINE_PHOTO: (detail: string) => `Refine this photo data: ${detail}`
};
