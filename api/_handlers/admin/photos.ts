import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import * as v from 'valibot';
import { successResponse } from '../../_lib/response.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { errorFactory } from '../../_lib/error/factory.js';
import { toCamelCaseKeys } from '../../_lib/utils.js';
import { batchDeleteFromR2 } from '../../_lib/storage.js';
import { furnitureItems } from '../../_lib/db/index.js';
import { 
    getAiResultForPhoto, 
    updatePhotoWithTags, 
    getPhotosByIds, 
    deletePhotos, 
    batchUpdatePhotos, 
    updatePhoto 
} from '../../_lib/db/queries/photos.js';
import { type aiAuditLogs, type systemLogs } from '../../_lib/db/index.js';

export const adminPhotos = new Hono()
.get("/:id/ai-result", async (c) => {
    const photoId = c.req.param('id');
    const result = await getAiResultForPhoto(photoId);
    
    if (!result) return successResponse(c, null);

    let rawResult = '';
    let parsedData: unknown = null;
    let createdAt: Date | null = null;

    if (result.source === 'audit_log') {
        const auditLog = result.data as typeof aiAuditLogs.$inferSelect;
        createdAt = auditLog.createdAt;
        parsedData = auditLog.cleanedOutput || null;

        if (auditLog.rawOutput) {
            let ro = auditLog.rawOutput;
            if (typeof ro === 'object' && ro !== null && 'raw_text' in ro) {
                ro = (ro as any).raw_text;
            }
            rawResult = typeof ro === 'object' ? JSON.stringify(ro, null, 2) : String(ro);
        }
        
        if (!rawResult && auditLog.cleanedOutput) {
            rawResult = typeof auditLog.cleanedOutput === 'object' ? JSON.stringify(auditLog.cleanedOutput, null, 2) : String(auditLog.cleanedOutput);
        }
    } else if (result.source === 'system_log') {
        const logRecord = result.data as typeof systemLogs.$inferSelect;
        createdAt = logRecord.createdAt;
        const metadata = logRecord.metadata as Record<string, unknown>;
        let rawOutput = metadata.raw_output || metadata.raw_result || metadata.rawText || metadata.text || metadata.ai_raw;
        if (typeof rawOutput === 'object' && rawOutput !== null && 'raw_text' in rawOutput) {
            rawOutput = (rawOutput as Record<string, unknown>).raw_text;
        }
        if (!rawOutput) {
            rawOutput = metadata.parsed_data || metadata.cleaned_output || metadata.result;
        }
        rawResult = typeof rawOutput === 'object' ? JSON.stringify(rawOutput, null, 2) : (rawOutput as string) || '';
        parsedData = metadata.parsed_data || metadata.cleaned_output || metadata.result || null;
    } else if (result.source === 'metadata') {
        const metadata = result.data as Record<string, unknown>;
        rawResult = metadata.ai_raw as string;
    }

    return successResponse(c, {
        photoId,
        rawResult,
        parsedData,
        createdAt: createdAt ? createdAt.toISOString() : null
    });
})
.patch("/:id", async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
        tags: v.optional(v.array(v.union([v.number(), v.string()]))),
    }), body);
    
    if (!check.success) throw errorFactory.validation(check.issues);

    const { tags: tagIds, ...otherUpdates } = body as { tags?: Array<string|number>, [key: string]: unknown };
    const mappedUpdates = toCamelCaseKeys<Record<string, unknown>>(otherUpdates);
    delete mappedUpdates.createdAt;

    const numericTagIds = tagIds ? tagIds.map(tid => Number(tid)).filter(tid => !isNaN(tid)) : undefined;

    await updatePhotoWithTags(id, mappedUpdates as Partial<typeof furnitureItems.$inferInsert>, numericTagIds);
    await refreshPhotosView();
    return successResponse(c, null);
})
.post("/batch/delete", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ ids: v.array(v.string()) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { ids } = check.output;

    const photosData = await getPhotosByIds(ids);
    await deletePhotos(ids);
    await refreshPhotosView();

    const fileKeys = photosData
        .map((p) => {
            if (!p || !p.imageUrl) return null;
            try {
                const url = new URL(p.imageUrl);
                return url.pathname.replace(/^\//, '');
            } catch {
                if (p.imageUrl.includes("photox/public/")) {
                    return "photox/public/" + p.imageUrl.split("photox/public/")[1];
                }
                return null;
            }
        })
        .filter((k): k is string => k !== null);

    if (fileKeys.length > 0) {
        await batchDeleteFromR2(fileKeys);
    }

    return successResponse(c, { count: ids.length });
})
.patch("/batch/edit", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ ids: v.array(v.string()), updates: v.record(v.string(), v.unknown()) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { ids, updates } = check.output;

    const mappedUpdates = toCamelCaseKeys<Record<string, unknown>>(updates);
    delete mappedUpdates.createdAt;

    if (Object.keys(mappedUpdates).length > 0) {
        await batchUpdatePhotos(ids, mappedUpdates as Partial<typeof furnitureItems.$inferInsert>);
    }

    await refreshPhotosView();
    return successResponse(c, null);
})
.post("/:id/pin", async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ isPinned: v.boolean() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { isPinned } = check.output;

    const [data] = await updatePhoto(id, { isPinned });
    await refreshPhotosView();
    return successResponse(c, data);
})
.post("/photo-ai-reextract", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ photoId: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoId } = check.output;

    const result = await getAiResultForPhoto(photoId);
    if (result && result.source === 'audit_log') {
        const auditLog = result.data as typeof aiAuditLogs.$inferSelect;
        return successResponse(c, {
            photoId,
            rawResult: auditLog.rawOutput || auditLog.cleanedOutput || '',
            parsedData: auditLog.cleanedOutput || null
        });
    }
    
    return successResponse(c, null);
});

