import { errorFactory } from "../_lib/error/factory.js";
import { Hono } from 'hono';
import { type Env } from '../_app.js';
import * as v from 'valibot';
import { db, furnitureItems, categories, tags, groups as groupsTable, groupCorrectionLogs, users } from '../_lib/db/index.js';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { getAIProvider, OpenRouterProvider, AgnesProvider, GeminiProvider, BaseAIProvider } from '../_lib/ai/providerFactory.js';
import { DEFAULT_AI_MODELS } from '../../shared/aiModels.js';
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
import { getEffectiveUserId } from '../_lib/auth.js';
import { normalizeImageUrl } from '../_lib/utils/image.js';
import { successResponse, errorResponse } from '../_lib/response.js';
import { syncGroupCoversAndCount } from '../_lib/groups.js';
import { refreshPhotosView } from '../_lib/db/actions.js';

interface HonoContextUser {
    id: string;
    email?: string;
}

import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const ai = new Hono<Env>()
  .post("/test", async (c) => {
    const body = await c.req.json();
    let { provider: providerName, apiKey, model } = body;
    
    if (apiKey) apiKey = String(apiKey).trim();

    let provider;
    if (apiKey) {
        if (providerName === 'agnes') {
            provider = new AgnesProvider({ apiKey, model: model || DEFAULT_AI_MODELS.agnes });
        } else if (providerName === 'gemini') {
            provider = new GeminiProvider({ apiKey, model: model || DEFAULT_AI_MODELS.gemini });
        } else {
            provider = new OpenRouterProvider({ apiKey, model: model || DEFAULT_AI_MODELS.openrouter });
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
    const model = modelConfig || provider.defaultModel;
    
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

    const { photoId, imageUrl: clientImageUrl } = check.output;
    
    // 1. Parallel Context & Photo Lookup (P0: Parallelization)
    const [photo, catData, tagData] = await Promise.all([
        (photoId && !photoId.startsWith('temp-') && !clientImageUrl) 
            ? db.query.furnitureItems.findFirst({ columns: { imageUrl: true }, where: eq(furnitureItems.id, photoId) })
            : Promise.resolve(null),
        db.select({ 
            id: categories.id, 
            name: categories.name,
            code: categories.code,
            description: categories.description,
        }).from(categories).limit(200),
        db.select({ 
            id: tags.id, 
            name: tags.name 
        }).from(tags).limit(500),
    ]).catch(err => {
        logger.warn("AI Analyze: Parallel context fetch failed partially:", err);
        return [null, [], []];
    });

    const finalImageUrl = normalizeImageUrl(clientImageUrl || (photo as { imageUrl: string | null })?.imageUrl);

    if (!finalImageUrl) return errorResponse(c, "Image URL is required for analysis", 400);

    const catRef = catData || [];
    const tagRef = tagData || [];

    const provider = await getAIProvider();
    const modelConfig = (provider as BaseAIProvider).getConfig().model;
    const model = modelConfig || provider.defaultModel;
    
    const context = {
        categories: catRef.map(c => {
            const desc = (c.description as Record<string, unknown>) || {};
            return {
                id: c.id,
                code: c.code || '',
                name: c.name || '',
                zhName: typeof desc === 'object' ? String(desc.zh || c.name) : c.name,
                enName: typeof desc === 'object' ? String(desc.en || '') : '',
            };
        }).slice(0, 100),
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

        const resultPayload = Array.isArray(data)
            ? { ...(data[0] || {}), items: data, raw_result: rawText }
            : { ...(typeof data === 'object' && data !== null ? data : { result: data }), raw_result: rawText };

        return successResponse(c, resultPayload);
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
    const model = modelConfig || provider.defaultModel;

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
    const model = modelConfig || provider.defaultModel;

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
    const model = modelConfig || provider.defaultModel;

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

    const user = c.get('user');
    const userId = user?.id;

    // 1. AI 識別 - 排除臨時 ID
    const realPhotoIds = (check.output.photoIds || []).filter(id => !id.startsWith('temp-'));
    if (realPhotoIds.length === 0) {
        return successResponse(c, []);
    }
    
    // Fetch user context and process AI analysis in parallel (P0: Parallelization)
    const [parsed, sourcePhoto, finalUserId] = await Promise.all([
        processGroupAnalysis(realPhotoIds),
        db.query.furnitureItems.findFirst({
            columns: { userId: true },
            where: inArray(furnitureItems.id, realPhotoIds)
        }),
        getEffectiveUserId(c, userId)
    ]);

    const createdGroups: (typeof groupsTable.$inferSelect)[] = [];
    
    // 2. 事務性寫入 (批量化優化，消除手動狀態循環)
    const groupsToInsert = parsed.groups.map(g => {
        const gName = g.name;
        let finalName = '';
        if (typeof gName === 'string') {
            finalName = gName;
        } else if (gName && typeof gName === 'object') {
            finalName = String((gName as Record<string, unknown>).zh || (gName as Record<string, unknown>).en || '');
        }

        return {
            id: crypto.randomUUID(),
            name: finalName,
            description: g.description || { zh: '' },
            status: 'confirmed',
            userId: finalUserId,
            createdAt: new Date()
        };
    });

    if (groupsToInsert.length > 0) {
        const inserted = await db.insert(groupsTable).values(groupsToInsert).returning();
        createdGroups.push(...inserted);

        // 批量更新照片的組別 ID
        await Promise.all(groupsToInsert.map((group, idx) => {
            const photoIds = parsed.groups[idx].photoIds;
            if (photoIds && photoIds.length > 0) {
                return db.update(furnitureItems)
                    .set({ groupId: group.id })
                    .where(inArray(furnitureItems.id, photoIds));
            }
            return Promise.resolve();
        }));
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
