import { db, furnitureItems, categories, tags } from './api/_lib/db/index.js';
import { getAIProvider } from './api/_lib/ai/providerFactory.js';
import { executeAITask } from './api/_lib/ai/executor.js';
import { AI_PROMPTS } from './api/_handlers/ai/prompts.js';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("Fetching first valid photo...");
  const photo = await db.query.furnitureItems.findFirst({
    where: eq(furnitureItems.isHidden, false)
  });

  if (!photo) {
    console.error("No valid photo found in database!");
    process.exit(1);
  }

  console.log("Found photo ID:", photo.id);
  console.log("Image URL:", photo.imageUrl);

  console.log("Fetching context reference data...");
  const [catRef, tagRef] = await Promise.all([
    db.select({ 
      id: categories.id, 
      nameZh: categories.nameZh,
      nameEn: categories.nameEn,
      nameMs: categories.nameMs
    }).from(categories).limit(200),
    db.select({ 
      id: tags.id, 
      name: tags.name 
    }).from(tags).limit(500),
  ]);

  const provider = await getAIProvider();
  console.log("AI Provider name:", provider.name);
  
  const modelConfig = provider.getConfig().model;
  const model = modelConfig || 'google/gemini-2.5-flash-lite';
  console.log("Using model:", model);

  const context = {
    categories: catRef.map(c => ({ 
      id: c.id, 
      zh: c.nameZh, 
      en: c.nameEn, 
      ms: c.nameMs 
    })).slice(0, 100),
    tags: tagRef.map(t => ({ 
      id: t.id, 
      name: t.name 
    })).slice(0, 150),
  };

  const prompt = AI_PROMPTS.ANALYZE_PHOTO(context);
  const messages = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: photo.imageUrl } }, { type: 'text', text: prompt }]}];

  console.log("Executing AI Task...");
  try {
    const result = await executeAITask({
      task: 'analyze',
      provider,
      model,
      messages,
      prompt,
      metadata: { photoId: photo.id, imageUrl: photo.imageUrl }
    });

    console.log("AI Execution SUCCESS!");
    console.log("Result data:", JSON.stringify(result.data, null, 2));
  } catch (err) {
    console.error("AI Execution FAILED with error:", err);
  }

  process.exit(0);
}

main().catch(console.error);
