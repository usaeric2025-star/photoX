import * as v from 'valibot';
const AIAnalysisSchema = v.object({
  imageUrl: v.string(),
});
const result = v.safeParse(AIAnalysisSchema, { imageUrl: 'https://example.com' });
console.log(result);
