import { Hono } from 'hono';
import { type } from 'arktype';
import { db, furnitureItems, categories, tags, groups as groupsTable, groupCorrectionLogs, users } from '../../src/db/index.js';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { getAIProvider, OpenRouterProvider, AgnesProvider, BaseAIProvider } from '../_lib/ai/providerFactory.js';
import { executeAITask } from '../_lib/ai/executor.js';
import { processGroupAnalysis } from './ai/groupAnalysis.js';
import { 
    AIAnalyzeV1ReqSchema, 
    AIRunReqSchema, 
    AIAnalyzeBase64ReqSchema, 
    AITranslateReqSchema,
    AIAnalyzeGroupReqSchema,
    AIAnalyzePhotoV2ReqSchema,
    AIClusterPhotosReqSchema,
    ApiResponse,
    JsonObject
} from '../_shared/apiContractSchema.js';
import { AI_PROMPTS } from './ai/prompts.js';

interface HonoContextUser {
    id: string;
    email?: string;
}

export const ai = new Hono();

ai.post("/test", async (c) => {
    try {
        const body = await c.req.json();
        let { provider: providerName, apiKey, model } = body;
        
        if (apiKey) apiKey = String(apiKey).trim();

        let provider;
        if (apiKey) {
            if (providerName === 'agnes') {
                provider = new AgnesProvider({ apiKey, model: model || 'gemini-2.0-flash-exp' });
            } else {
                provider = new OpenRouterProvider({ apiKey, model: model || 'google/gemini-2.5-flash-lite' });
            }
        } else {
            provider = await getAIProvider(providerName, model);
        }

        const chatPromise = provider.chat([{ role: 'user', content: 'test connection' }]);
        const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) => 
            setTimeout(() => reject(new Error('AI 連線測試超時 (15s)')), 15000)
        );

        const data = await Promise.race([chatPromise, timeoutPromise]) as { success: boolean; error?: unknown; text?: string };
        if (!data.success) {
            const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error || 'Unknown AI error');
            throw new Error(errorMsg);
        }

        return c.json({ success: true, message: 'Connection successful', data: data.text });
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

ai.post("/run", async (c) => {
    try {
        const body = await c.req.json();
        const check = AIRunReqSchema(body);
        if (check instanceof type.errors) throw new Error(check.summary);
        
        const { task, imageUrl, prompt } = check;
        const provider = await getAIProvider('');
        const modelConfig = (provider as BaseAIProvider).getConfig().model;
        const model = modelConfig || 'google/gemini-2.5-flash-lite';
        
        const messages = imageUrl 
            ? [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt || 'Analyze this image' }]}]
            : [{ role: 'user', content: prompt || "" }];

        const { data, rawText } = await executeAITask({
            task: (task || 'run') as string,
            provider,
            model,
            messages,
            prompt: prompt || 'Analyze this image',
            metadata: { imageUrl },
            shouldNormalize: false
        });

        return c.json({ success: true, text: data as string, raw_result: rawText, usage: {} } as ApiResponse);
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' } as ApiResponse, 500);
    }
});

ai.post("/analyze", async (c) => {
    try {
        const body = await c.req.json();
        const check = AIAnalyzeV1ReqSchema(body);
        if (check instanceof type.errors) throw new Error(check.summary);

        const { photoId, imageUrl } = check;
        let finalImageUrl = imageUrl;

        if (photoId) {
            const photo = await db.query.furnitureItems.findFirst({
                columns: { imageUrl: true },
                where: eq(furnitureItems.id, photoId)
            });
            if (photo) finalImageUrl = photo.imageUrl ?? undefined;
        }

        if (!finalImageUrl) finalImageUrl = undefined;
        if (!finalImageUrl) throw new Error("Image URL is required for analysis");

        const [catRef, tagRef, groupRef] = await Promise.all([
            db.select().from(categories),
            db.select().from(tags),
            db.select().from(groupsTable)
                .where(eq(groupsTable.status, 'confirmed'))
                .orderBy(desc(groupsTable.createdAt))
                .limit(40),
        ]);

        const provider = await getAIProvider();
        const modelConfig = (provider as BaseAIProvider).getConfig().model;
        const model = modelConfig || 'google/gemini-2.5-flash-lite';
        
        const context = {
            categories: catRef.map(c => ({ id: c.id, name: c.nameZh, zh: c.nameZh })).slice(0, 50),
            tags: tagRef.map(t => ({ id: t.id, name: t.name, aliases: t.aliases })).slice(0, 100),
            groups: groupRef.map(g => ({ id: g.id, name: typeof g.name === 'object' ? (g.name as any)?.zh : g.name })),
        };
        
        const prompt = AI_PROMPTS.ANALYZE_PHOTO(context);
        const messages = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: finalImageUrl } }, { type: 'text', text: prompt }]}];

        const { data, rawText } = await executeAITask({
            task: 'analyze',
            provider,
            model,
            messages,
            prompt,
            metadata: { photoId, imageUrl: finalImageUrl }
        });

        if (data && (data as { _fallback?: boolean })._fallback) {
            throw new Error((data as { _error?: string })._error || 'AI analysis failed');
        }

        return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' } as ApiResponse, 500);
    }
});

ai.post("/analyze-base64", async (c) => {
    try {
      const body = await c.req.json();
      const check = AIAnalyzeBase64ReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const { base64Image, customModel, promptText } = check;
      const provider = await getAIProvider(undefined, customModel);
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'analyze-base64',
          provider,
          model,
          messages: [{ role: "user", content: [{ type: "text", text: promptText || "Analyze this image" }, { type: "image_url", image_url: { url: base64Image } }] }],
          prompt: promptText || "Analyze this image",
          metadata: { type: 'base64' }
      });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI base64 analysis failed');
      }

      return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' } as ApiResponse, 500); 
    }
});

ai.post("/translate", async (c) => {
    try {
      const body = await c.req.json();
      const check = AITranslateReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const { customModel, promptText } = check;
      const provider = await getAIProvider(undefined, customModel);
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'translate',
          provider,
          model,
          messages: [{ role: "user", content: promptText }],
          prompt: promptText,
          shouldNormalize: false
      });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI translation failed');
      }

      return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown AI error' } as ApiResponse, 500); 
    }
});

ai.post("/analyze-group", async (c) => {
    try {
      const body = await c.req.json();
      const check = AIAnalyzeGroupReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const prompt = AI_PROMPTS.ANALYZE_GROUP(check.photoDetails);
      const provider = await getAIProvider();
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'analyze-group',
          provider,
          model,
          messages: [{ role: "user", content: prompt }],
          prompt
      });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI group analysis failed');
      }

      return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown AI error' } as ApiResponse, 500); 
    }
});

ai.post("/analyze-photo-v2", async (c) => {
    try {
      const body = await c.req.json();
      const check = AIAnalyzePhotoV2ReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const prompt = AI_PROMPTS.REFINE_PHOTO(check.photoDetail);
      const provider = await getAIProvider();
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'analyze-photo-v2',
            provider,
            model,
            messages: [{ role: "user", content: prompt }],
            prompt,
            metadata: { photoId: check.photoId }
        });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI refine photo failed');
      }

        return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown AI error' } as ApiResponse, 500); 
    }
});

ai.post("/cluster-photos", async (c) => {
    try {
        const body = await c.req.json();
        const check = AIClusterPhotosReqSchema(body);
        if (check instanceof type.errors) throw new Error(check.summary);

        const user = (c as { get: (key: string) => HonoContextUser | undefined }).get('user');
        const userId = user?.id;

        // 1. AI 識別
        const parsed = await processGroupAnalysis(check.photoIds);
        const createdGroups: any[] = [];

        // Optimize: Fetch a valid user_id
        let dbUserId: string | undefined = undefined;
        if (check.photoIds && check.photoIds.length > 0) {
            const sourcePhoto = await db.query.furnitureItems.findFirst({
                columns: { userId: true },
                where: inArray(furnitureItems.id, check.photoIds)
            });
            if (sourcePhoto?.userId) {
                dbUserId = sourcePhoto.userId;
            }
        }

        // 2. 事務性寫入 (手動類比)
        for (const g of parsed.groups) {
            const groupId = crypto.randomUUID();
            
            let finalUserId = (userId && userId !== 'staff') ? userId : dbUserId;
            if (!finalUserId) {
               const userRecord = await db.query.users.findFirst({ columns: { id: true } });
               finalUserId = userRecord?.id || '8ec53131-a589-4b50-beb4-6b5308541e1b';
            }

            const [groupData] = await db.insert(groupsTable).values({
                id: groupId,
                name: { zh: g.name, en: g.name_en, ms: g.name_ms },
                status: 'confirmed',
                userId: finalUserId,
                createdAt: new Date()
            } as any).returning();

            await db.update(furnitureItems)
                .set({ groupId: groupId })
                .where(inArray(furnitureItems.id, g.photoIds));

            createdGroups.push(groupData);
        }

        // 3. 記錄操作日誌
        await db.insert(groupCorrectionLogs).values({
            operation: 'ai_cluster',
            inputPhotoIds: check.photoIds,
            createdGroups: createdGroups.map(g => g.id),
            userId: userId,
            createdAt: new Date()
        } as any);

        return c.json({ success: true, data: createdGroups } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' } as ApiResponse, 500); 
    }
});
