import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, categories, tags, groups as groupsTable, groupCorrectionLogs, users } from '../_lib/db/index.js';
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
} from '../../shared/apiContractSchema.js';
import { AI_PROMPTS } from './ai/prompts.js';
import { logger } from '../_lib/logger.js';
import { errorResponse } from '../_lib/response.js';

interface HonoContextUser {
    id: string;
    email?: string;
}

import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const ai = new Hono();

ai.post("/test", async (c) => {
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
    const data = await withTimeout(chatPromise, TIMEOUTS.AI_REQUEST, 'AI Chat Test Connection').catch(e => ({ success: false, error: e })) as { success: boolean; error?: unknown; text?: string };

    if (!data.success) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error || 'Unknown AI error');
        return errorResponse(c, errorMsg, 500);
    }

    return c.json({ success: true, message: 'Connection successful', data: data.text });
});

ai.post("/run", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIRunReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);
    
    const { task, imageUrl, prompt } = check.output;
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

    return c.json({ success: true, text: data as string, rawResult: rawText, usage: {} } as ApiResponse);
});

ai.post("/analyze", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIAnalyzeV1ReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { photoId, imageUrl } = check.output;
    let finalImageUrl = imageUrl;

    if (photoId) {
        const photo = await db.query.furnitureItems.findFirst({
            columns: { imageUrl: true },
            where: eq(furnitureItems.id, photoId)
        });
        if (photo) finalImageUrl = photo.imageUrl ?? undefined;
    }

    if (!finalImageUrl) finalImageUrl = undefined;
    if (!finalImageUrl) return errorResponse(c, "Image URL is required for analysis", 400);

    // Use safer query approach - select only what we need and handle errors per-table
    let catRef: { id: number; nameZh: string | null }[] = [];
    let tagRef: { id: string | number; name: string | null; aliases?: string[] | null }[] = [];
    let groupRef: { id: string; name: unknown; status: string | null; createdAt: Date | null }[] = [];

    try {
        const [catData, tagData, groupData] = await Promise.all([
            db.select({ id: categories.id, nameZh: categories.nameZh }).from(categories).limit(200),
            db.select({ id: tags.id, name: tags.name }).from(tags).limit(500),
            db.select({ id: groupsTable.id, name: groupsTable.name, status: groupsTable.status, createdAt: groupsTable.createdAt })
                .from(groupsTable)
                .where(eq(groupsTable.status, 'confirmed'))
                .orderBy(desc(groupsTable.createdAt))
                .limit(40),
        ]);
        catRef = catData;
        tagRef = tagData;
        groupRef = groupData;
    } catch (err: unknown) {
        logger.warn("AI Analyze: Background context fetch failed partially:", err);
        // Continue with whatever we managed to fetch (empty arrays if everything failed)
    }

    const provider = await getAIProvider();
    const modelConfig = (provider as BaseAIProvider).getConfig().model;
    const model = modelConfig || 'google/gemini-2.5-flash-lite';
    
    const context = {
        categories: catRef.map(c => ({ id: c.id, name: c.nameZh, zh: c.nameZh })).slice(0, 50),
        tags: tagRef.map(t => ({ id: t.id, name: t.name, aliases: t.aliases || [] })).slice(0, 100),
        groups: groupRef.map(g => ({ id: g.id, name: typeof g.name === 'object' ? (g.name as Record<string, string> | null)?.zh : g.name })),
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
        return errorResponse(c, (data as { _error?: string })._error || 'AI analysis failed', 500);
    }

    return c.json({ success: true, data, rawResult: rawText } as ApiResponse);
});

ai.post("/translate", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AITranslateReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { customModel, promptText } = check.output;
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
        return errorResponse(c, (data as { _error?: string })._error || 'AI translation failed', 500);
    }

    return c.json({ success: true, data, rawResult: rawText } as ApiResponse);
});

ai.post("/analyze-group", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIAnalyzeGroupReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const prompt = AI_PROMPTS.ANALYZE_GROUP(check.output.photoDetails);
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
        return errorResponse(c, (data as { _error?: string })._error || 'AI group analysis failed', 500);
    }

    return c.json({ success: true, data, rawResult: rawText } as ApiResponse);
});

ai.post("/analyze-photo-v2", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIAnalyzePhotoV2ReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const prompt = AI_PROMPTS.REFINE_PHOTO(check.output.photoDetail);
    const provider = await getAIProvider();
    const modelConfig = (provider as BaseAIProvider).getConfig().model;
    const model = modelConfig || 'google/gemini-2.5-flash-lite';

    const { data, rawText } = await executeAITask({
        task: 'analyze-photo-v2',
        provider,
        model,
        messages: [{ role: "user", content: prompt }],
        prompt,
        metadata: { photoId: check.output.photoId }
    });

    if (data && (data as { _fallback?: boolean })._fallback) {
        return errorResponse(c, (data as { _error?: string })._error || 'AI refine photo failed', 500);
    }

    return c.json({ success: true, data, rawResult: rawText } as ApiResponse);
});

ai.post("/cluster-photos", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIClusterPhotosReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const user = c.get('user' as never) as HonoContextUser | undefined;
    const userId = user?.id;

    // 1. AI 識別
    const parsed = await processGroupAnalysis(check.output.photoIds);
    const createdGroups: (typeof groupsTable.$inferSelect)[] = [];

    // Optimize: Fetch a valid user_id
    let dbUserId: string | undefined = undefined;
    if (check.output.photoIds && check.output.photoIds.length > 0) {
        const sourcePhoto = await db.query.furnitureItems.findFirst({
            columns: { userId: true },
            where: inArray(furnitureItems.id, check.output.photoIds)
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

        const [groupData] = await db.insert(groupsTable).values([{
            id: groupId,
            name: { zh: g.name },
            status: 'confirmed',
            userId: finalUserId,
            createdAt: new Date()
        } as unknown as typeof groupsTable.$inferInsert]).returning();

        await db.update(furnitureItems)
            .set({ groupId: groupId })
            .where(inArray(furnitureItems.id, g.photoIds));

        createdGroups.push(groupData);
    }

    // 3. 記錄操作日誌
    await db.insert(groupCorrectionLogs).values({
        operation: 'ai_cluster',
        inputPhotoIds: check.output.photoIds,
        createdGroups: createdGroups.map(g => g.id),
        userId: userId || null,
        createdAt: new Date()
    } as typeof groupCorrectionLogs.$inferInsert);

    return c.json({ success: true, data: createdGroups } as ApiResponse);
});
