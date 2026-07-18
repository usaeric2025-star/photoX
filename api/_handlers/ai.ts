import { errorFactory } from "../_lib/error/factory.js";
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
import { errorResponse, successResponse } from '../_lib/response.js';
import { syncGroupCoversAndCount } from '../_lib/groups.js';
import { refreshPhotosView } from '../_lib/db/actions.js';

interface HonoContextUser {
    id: string;
    email?: string;
}

import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const ai = new Hono()
  .post("/test", async (c) => {
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

    return successResponse(c, { 
        text: data.text, 
        message: 'Connection successful' 
    });
})
.post("/run", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIRunReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);
    
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

    return successResponse(c, { 
        ...(typeof data === 'object' && data !== null ? data : { result: data }), 
        raw_result: rawText, 
        usage: {} 
    });
})
.post("/analyze", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIAnalyzeV1ReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);

    const { photoId, imageUrl } = check.output;
    let finalImageUrl = imageUrl;

    if (photoId && !photoId.startsWith('temp-')) {
        const photo = await db.query.furnitureItems.findFirst({
            columns: { imageUrl: true },
            where: eq(furnitureItems.id, photoId)
        });
        if (photo) finalImageUrl = photo.imageUrl ?? undefined;
    }

    if (!finalImageUrl) finalImageUrl = undefined;
    if (!finalImageUrl) return errorResponse(c, "Image URL is required for analysis", 400);

    // Normalize image URL to ensure it is fully qualified for Gemini API access
    const r2Base = process.env.R2_PUBLIC_URL_PREFIX || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev';
    const cleanBase = r2Base.endsWith('/') ? r2Base.slice(0, -1) : r2Base;

    if (!finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://')) {
        const cleanPath = finalImageUrl.startsWith('/') ? finalImageUrl.slice(1) : finalImageUrl;
        finalImageUrl = `${cleanBase}/${cleanPath}`;
    } else if (finalImageUrl.includes('/products/')) {
        finalImageUrl = finalImageUrl
            .replace('/products/', '/')
            .replace(/\/(\d+-[a-z0-9]+\.webp)$/i, '/temp-$1');
    }

    const match = finalImageUrl.match(/photox\/(public|thumb|original)\/(.+)/);
    if (match) {
        const pathAndFilename = match[0];
        finalImageUrl = `${cleanBase}/${pathAndFilename}`;
    }

    // Use safer query approach - select only what we need and handle errors per-table
    let catRef: { id: number; name: string | null }[] = [];
    let tagRef: { id: string | number; name: string | null }[] = [];
    let groupRef: { id: string; name: string | null; status: string | null; createdAt: Date | null }[] = [];

    try {
        const [catData, tagData] = await Promise.all([
            db.select({ 
                id: categories.id, 
                name: categories.name,
            }).from(categories).limit(200),
            db.select({ 
                id: tags.id, 
                name: tags.name 
            }).from(tags).limit(500),
        ]);
        catRef = catData;
        tagRef = tagData;
    } catch (err: unknown) {
        logger.warn("AI Analyze: Background context fetch failed partially:", err);
    }

    const provider = await getAIProvider();
    const modelConfig = (provider as BaseAIProvider).getConfig().model;
    const model = modelConfig || 'google/gemini-2.5-flash-lite';
    
    const context = {
        categories: catRef.map(c => ({ 
            id: c.id, 
            name: c.name
        })).slice(0, 100),
        tags: tagRef.map(t => ({ 
            id: t.id, 
            name: t.name 
        })).slice(0, 150),
    };
    
    const prompt = AI_PROMPTS.ANALYZE_PHOTO(context);
    const messages = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: finalImageUrl } }, { type: 'text', text: prompt }]}];

    try {
        const { data, rawText } = await withTimeout(
            executeAITask({
                task: 'analyze',
                provider,
                model,
                messages,
                prompt,
                metadata: { photoId, imageUrl: finalImageUrl }
            }),
            TIMEOUTS.AI_REQUEST,
            'AI Analyze Photo'
        );

        if (data && (data as { _fallback?: boolean })._fallback) {
            return errorResponse(c, (data as { _error?: string })._error || 'AI analysis failed', 500);
        }

        return successResponse(c, {
            ...(typeof data === 'object' && data !== null ? data : { result: data }),
            raw_result: rawText
        });
    } catch (err: unknown) {
        logger.error('[AI Analyze] Error or Timeout:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return errorResponse(c, `AI分析服务异常或超时: ${errMsg}`, 504);
    }
})
.post("/translate", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AITranslateReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);

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

    return successResponse(c, {
        ...(typeof data === 'object' && data !== null ? data : { result: data }),
        raw_result: rawText
    });
})
.post("/analyze-base64", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIAnalyzeBase64ReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);

    const { base64Image, promptText, provider: providerName } = check.output;
    const provider = await getAIProvider(providerName);
    const modelConfig = (provider as BaseAIProvider).getConfig().model;
    const model = modelConfig || 'google/gemini-2.5-flash-lite';

    const messages = [{ 
        role: 'user', 
        content: [
            { type: 'image_url', image_url: { url: base64Image } }, 
            { type: 'text', text: promptText || 'Analyze this image' }
        ]
    }];

    const { data, rawText } = await executeAITask({
        task: 'analyze-base64',
        provider,
        model,
        messages,
        prompt: promptText || 'Analyze this image',
        shouldNormalize: false
    });

    return successResponse(c, {
        ...(typeof data === 'object' && data !== null ? data : { result: data }),
        raw_result: rawText
    });
})
.post("/analyze-photo-v2", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIAnalyzePhotoV2ReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);

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

    return successResponse(c, {
        ...(typeof data === 'object' && data !== null ? data : { result: data }),
        raw_result: rawText
    });
})
.post("/cluster-photos", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(AIClusterPhotosReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);

    const user = c.get('user' as never) as HonoContextUser | undefined;
    const userId = user?.id;

    // 1. AI 識別 - 排除臨時 ID
    const realPhotoIds = (check.output.photoIds || []).filter(id => !id.startsWith('temp-'));
    if (realPhotoIds.length === 0) {
        return successResponse(c, []);
    }
    
    const parsed = await processGroupAnalysis(realPhotoIds);
    const createdGroups: (typeof groupsTable.$inferSelect)[] = [];
    
    // Optimize: Fetch a valid user_id
    let dbUserId: string | undefined = undefined;
    if (realPhotoIds.length > 0) {
        const sourcePhoto = await db.query.furnitureItems.findFirst({
            columns: { userId: true },
            where: inArray(furnitureItems.id, realPhotoIds)
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

        // Prepare localized name and description
        const groupName = typeof g.name === 'string' ? g.name : (g.name as any)?.zh || '';
        const groupDesc = g.description || { zh: '' };

        const [groupData] = await db.insert(groupsTable).values([{
            id: groupId,
            name: groupName,
            description: groupDesc,
            status: 'confirmed',
            userId: finalUserId,
            createdAt: new Date()
        }]).returning();

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

    // Reconcile and synchronize covers/counts for the newly created groups
    if (createdGroups.length > 0) {
        await syncGroupCoversAndCount(createdGroups.map(g => g.id));
    }
    await refreshPhotosView();

    return successResponse(c, createdGroups);
});
