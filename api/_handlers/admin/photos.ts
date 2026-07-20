import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, aiAuditLogs, systemLogs, furnitureItems, photoTags } from '../../_lib/db/index.js';
import { eq, desc, inArray, sql, like } from "drizzle-orm";
import { errorResponse, successResponse } from '../../_lib/response.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { errorFactory } from '../../_lib/error/factory.js';
import { toCamelCaseKeys } from '../../_lib/utils.js';

export const adminPhotos = new Hono()
.get("/:id/ai-result", async (c) => {
    try {
        const photoId = c.req.param('id');
        if (!photoId) return errorResponse(c, "id is required", 400);

        // 1. Try querying ai_audit_logs first
        let auditLog = null;
        if (!photoId.startsWith('temp-')) {
            auditLog = await db.query.aiAuditLogs.findFirst({
                where: eq(aiAuditLogs.photoId, photoId),
                orderBy: [desc(aiAuditLogs.createdAt)]
            });
        }

        // If no direct audit log matches, check for fallback records avoiding FK issues
        if (!auditLog) {
            const fallbackLogs = await db.select()
                .from(aiAuditLogs)
                .where(sql`cleaned_output->>'_failedConstraintPhotoId' = ${photoId}`)
                .orderBy(desc(aiAuditLogs.createdAt))
                .limit(1);
            if (fallbackLogs && fallbackLogs.length > 0) {
                auditLog = fallbackLogs[0] as typeof aiAuditLogs.$inferSelect;
            }
        }

        if (auditLog) {
            let rawResult = '';
            
            // Try various possible raw keys
            if (auditLog.rawOutput) {
                let ro = auditLog.rawOutput;
                if (typeof ro === 'object' && ro !== null && 'raw_text' in ro) {
                    ro = (ro as Record<string, unknown>).raw_text;
                }
                rawResult = typeof ro === 'object' 
                    ? JSON.stringify(ro, null, 2)
                    : String(ro);
            }
            
            if (!rawResult && auditLog.cleanedOutput) {
                rawResult = typeof auditLog.cleanedOutput === 'object' 
                    ? JSON.stringify(auditLog.cleanedOutput, null, 2)
                    : String(auditLog.cleanedOutput);
            }
            
            // If still nothing, check metadata column if it exists in auditLog (future proofing)
            if (!rawResult && (auditLog as { metadata?: unknown }).metadata) {
                const meta = (auditLog as { metadata?: unknown }).metadata as Record<string, unknown>;
                const possibleRaw = meta.raw_output || meta.raw_result || meta.rawText || meta.text;
                if (possibleRaw) {
                    rawResult = typeof possibleRaw === 'object' ? JSON.stringify(possibleRaw, null, 2) : String(possibleRaw);
                }
            }

            if (!rawResult) {
                rawResult = JSON.stringify({
                    status: auditLog.status || "success",
                    model: auditLog.model || "Gemini-2.0",
                    prompt_version: auditLog.promptVersion || "v1",
                    analysis_timestamp: auditLog.createdAt,
                    warning: "Raw stream was unreachable, reconstructed from metadata.",
                    data_present: !!auditLog.cleanedOutput
                }, null, 2);
            }

            const resultObj = {
                photoId: photoId,
                rawResult: rawResult,
                parsedData: auditLog.cleanedOutput || null,
                createdAt: auditLog.createdAt
            };
            return successResponse(c, resultObj);
        }

        // 2. Fallback to older system_logs
        let rawLogs = await db.select()
            .from(systemLogs)
            .where(sql`${systemLogs.operation} = 'AI_Executor' AND ${systemLogs.message} = ${`AI analysis completed for photo ${photoId}`}`)
            .orderBy(desc(systemLogs.createdAt))
            .limit(1);

        if (!rawLogs || rawLogs.length === 0) {
            // Slower fallback query using JSONB unpacking
            rawLogs = await db.select()
                .from(systemLogs)
                .where(sql`${systemLogs.operation} = 'AI_Executor' AND (metadata->>'photo_id') = ${photoId}`)
                .orderBy(desc(systemLogs.createdAt))
                .limit(1);
        }

        const logRecord = rawLogs?.[0];
        if (logRecord && logRecord.metadata) {
            const metadata = logRecord.metadata as Record<string, unknown>;
            // Try all common keys for raw AI output
            let rawOutput = metadata.raw_output || metadata.raw_result || metadata.rawText || metadata.text || metadata.ai_raw;
            if (typeof rawOutput === 'object' && rawOutput !== null && 'raw_text' in rawOutput) {
                rawOutput = (rawOutput as Record<string, unknown>).raw_text;
            }
            if (!rawOutput) {
                rawOutput = metadata.parsed_data || metadata.cleaned_output || metadata.result;
            }
            
            const resultObj = {
                photoId: photoId,
                rawResult: typeof rawOutput === 'object' ? JSON.stringify(rawOutput, null, 2) : (rawOutput as string) || '',
                parsedData: metadata.parsed_data || metadata.cleaned_output || metadata.result || null,
                createdAt: logRecord.createdAt
            };

            return successResponse(c, resultObj);
        }

        // 3. Last fallback: Check furniture_items metadata column
        let item = null;
        if (!photoId.startsWith('temp-')) {
            item = await db.query.furnitureItems.findFirst({
                columns: { metadata: true },
                where: eq(furnitureItems.id, photoId)
            });
        }

        if (item?.metadata && (item.metadata as Record<string, unknown>).ai_raw) {
            return successResponse(c, {
                photoId: photoId,
                rawResult: (item.metadata as Record<string, unknown>).ai_raw as string,
                parsedData: null,
                createdAt: null
            });
        }

        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.photo-ai-result', 'DB_ERROR');
    }
})
.patch("/:id", async (c) => {
    try {
        const id = c.req.param('id');
        const updates = await c.req.json();
        if (!id) return errorResponse(c, "id is required", 400);

        const { tags: tagIds, ...otherUpdates } = updates;

        // Map updates to camelCase for furnitureItems
        const mappedUpdates = toCamelCaseKeys<Record<string, any>>(otherUpdates);

        await db.transaction(async (tx) => {
            if (Object.keys(mappedUpdates).length > 0) {
                await tx.update(furnitureItems).set(mappedUpdates).where(eq(furnitureItems.id, id));
            }

            if (Array.isArray(tagIds)) {
                // Delete old tags
                await tx.delete(photoTags).where(eq(photoTags.photoId, id));
                
                // Insert new tags if any
                if (tagIds.length > 0) {
                    const tagInsertValues = tagIds
                        .map(tid => ({
                            photoId: id,
                            tagId: Number(tid)
                        }))
                        .filter(v => !isNaN(v.tagId));
                    
                    if (tagInsertValues.length > 0) {
                        await tx.insert(photoTags).values(tagInsertValues);
                    }
                }
            }
        });

        await refreshPhotosView();
        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.photo-update', 'DB_ERROR');
    }
})
.post("/batch/delete", async (c) => {
    try {
        const { ids } = await c.req.json();
        if (!ids || !Array.isArray(ids)) {
            return errorResponse(c, "ids array required", 400);
        }

        const photosData = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl })
            .from(furnitureItems)
            .where(inArray(furnitureItems.id, ids));

        // Clean up associated system_logs
        if (ids.length > 0) {
            try {
                await db.delete(systemLogs)
                    .where(sql`${systemLogs.operation} = 'AI_Executor' AND (metadata->>'photo_id') IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
                
                // Also clean up ai_audit_logs
                await db.delete(aiAuditLogs)
                    .where(inArray(aiAuditLogs.photoId, ids));
            } catch (err) {
                logger.warn("[delete-photos] Clean up associated logs failed:", err);
            }
        }

        await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
        await refreshPhotosView();

        if (photosData && photosData.length > 0) {
            const { getR2Client } = await import("../../_lib/storage.js");
            const s3Client = await getR2Client();
            const bucketName = process.env.R2_BUCKET_NAME;
            if (bucketName) {
                const fileKeys = photosData
                    .map((p) => {
                        if (!p.imageUrl) return null;
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
                    .filter(Boolean) as string[];

                if (fileKeys.length > 0) {
                    await Promise.all(fileKeys.map(async (key) => {
                        try {
                            const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
                            const command = new DeleteObjectCommand({
                                Bucket: bucketName,
                                Key: key,
                            });
                            await s3Client.send(command, { abortSignal: AbortSignal.timeout(5000) });
                        } catch (r2Err) {
                            logger.error(`Failed to delete key ${key} from R2 during database delete:`, r2Err);
                        }
                    }));
                }
            }
        }

        return successResponse(c, { count: ids.length });
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.delete-photos', 'DB_ERROR');
    }
})
.patch("/batch/edit", async (c) => {
    try {
        const { ids, updates } = await c.req.json();
        if (!ids || !Array.isArray(ids)) return errorResponse(c, "ids array required", 400);

        const mappedUpdates = toCamelCaseKeys<Record<string, any>>(updates);

        if (Object.keys(mappedUpdates).length > 0) {
            await db.update(furnitureItems)
                .set({ ...mappedUpdates, updatedAt: new Date() })
                .where(inArray(furnitureItems.id, ids));
        }

        await refreshPhotosView();
        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.batch-edit', 'DB_ERROR');
    }
})
.post("/:id/pin", async (c) => {
    try {
        const id = c.req.param('id');
        const { isPinned } = await c.req.json();
        const [data] = await db.update(furnitureItems)
            .set({ isPinned, updatedAt: new Date() })
            .where(eq(furnitureItems.id, id))
            .returning();
        
        await refreshPhotosView();
        return successResponse(c, data);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.pin-photo', 'DB_ERROR');
    }
});

