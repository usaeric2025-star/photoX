import { db, furnitureItems, aiAuditLogs, systemLogs, photoTags, categories, groups, tags as tagsTable } from '../index.js';
import { eq, inArray, desc, sql } from 'drizzle-orm';

const photoInclude = {
    tags: {
        with: {
            tag: true as const
        }
    },
    category: true as const,
    group: true as const
};

export interface PhotoQueryParams {
    page?: number;
    limit?: number;
    isAdminMode?: boolean;
    search?: string;
    categoryId?: number;
    tagId?: number;
    groupId?: string;
    sort?: 'newest' | 'pinned';
}

export async function getPhotosList(params: PhotoQueryParams) {
    const { page = 1, limit = 100, isAdminMode = false, search, categoryId, groupId, sort = 'newest' } = params;
    
    let whereClause = sql`TRUE`;
    if (!isAdminMode) {
        whereClause = sql`${furnitureItems.isHidden} = FALSE`;
    }

    if (categoryId) {
        whereClause = sql`${whereClause} AND ${furnitureItems.categoryId} = ${categoryId}`;
    }
    if (groupId) {
        whereClause = sql`${whereClause} AND ${furnitureItems.groupId} = ${groupId}`;
    }
    if (search) {
        whereClause = sql`${whereClause} AND (${furnitureItems.manualCode} ILIKE ${`%${search}%`} OR ${furnitureItems.id} ILIKE ${`%${search}%`})`;
    }

    // Handle tag filtering via a subquery or join if needed, but for now let's use what we have
    
    const results = await db.query.furnitureItems.findMany({
        where: whereClause,
        limit,
        offset: (page - 1) * limit,
        orderBy: sort === 'newest' ? [desc(furnitureItems.createdAt)] : [desc(furnitureItems.isPinned), desc(furnitureItems.createdAt)],
        with: photoInclude
    });

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(furnitureItems).where(whereClause);

    return {
        items: results.map(formatPhoto),
        total: Number(count),
        nextCursor: results.length === limit ? results[results.length - 1].createdAt : null
    };
}

export async function getGroupCounts(groupIds: string[], isAdminMode: boolean = false) {
    if (groupIds.length === 0) return new Map<string, number>();

    const whereClause = isAdminMode ? sql`TRUE` : sql`${furnitureItems.isHidden} = FALSE`;
    
    const counts = await db.select({
        groupId: furnitureItems.groupId,
        count: sql<number>`count(*)`
    })
    .from(furnitureItems)
    .where(sql`${furnitureItems.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)}) AND ${whereClause}`)
    .groupBy(furnitureItems.groupId);

    const resultMap = new Map<string, number>();
    counts.forEach(c => {
        if (c.groupId) resultMap.set(c.groupId, Number(c.count));
    });
    return resultMap;
}

export async function clearCountCache() {
    // Placeholder if we had cache
}

type PhotoWithIncludes = typeof furnitureItems.$inferSelect & {
    category: typeof categories.$inferSelect | null;
    group: typeof groups.$inferSelect | null;
    tags: Array<{
        tagId: number;
        tag: typeof tagsTable.$inferSelect;
    }>;
};

function formatPhoto(photo: PhotoWithIncludes | undefined) {
    if (!photo) return null;
    const { tags, category, group, ...rest } = photo;
    return {
        ...rest,
        category,
        group,
        photoTags: tags.map((t) => ({ 
            tagId: t.tagId,
            tags: t.tag
        }))
    };
}

export async function getPhotosByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const results = await db.query.furnitureItems.findMany({
        where: inArray(furnitureItems.id, ids),
        with: photoInclude
    }) as PhotoWithIncludes[];
    return results.map(formatPhoto);
}

export async function getPhotoById(id: string) {
    const photo = await db.query.furnitureItems.findFirst({
        where: eq(furnitureItems.id, id),
        with: photoInclude
    }) as PhotoWithIncludes | undefined;
    return formatPhoto(photo);
}

export async function deletePhotos(ids: string[]) {
    if (ids.length === 0) return;
    
    // Clean up associated logs in background or parallel
    await Promise.allSettled([
        db.delete(systemLogs)
            .where(sql`${systemLogs.operation} = 'AI_Executor' AND (metadata->>'photo_id') IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`),
        db.delete(aiAuditLogs)
            .where(inArray(aiAuditLogs.photoId, ids))
    ]);

    return await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
}

export async function updatePhoto(id: string, updates: Partial<typeof furnitureItems.$inferInsert>) {
    return await db.update(furnitureItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(furnitureItems.id, id))
        .returning();
}

export async function updatePhotoWithTags(id: string, updates: Partial<typeof furnitureItems.$inferInsert>, tagIds?: number[]) {
    return await db.transaction(async (tx) => {
        let result = null;
        if (Object.keys(updates).length > 0) {
            [result] = await tx.update(furnitureItems).set({ ...updates, updatedAt: new Date() }).where(eq(furnitureItems.id, id)).returning();
        }

        if (Array.isArray(tagIds)) {
            await tx.delete(photoTags).where(eq(photoTags.photoId, id));
            if (tagIds.length > 0) {
                const tagInsertValues = tagIds.map(tid => ({ photoId: id, tagId: tid }));
                await tx.insert(photoTags).values(tagInsertValues);
            }
        }
        return result;
    });
}

export async function batchUpdatePhotos(ids: string[], updates: Partial<typeof furnitureItems.$inferInsert>) {
    if (ids.length === 0) return;
    return await db.update(furnitureItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(inArray(furnitureItems.id, ids))
        .returning();
}

export async function getAiResultForPhoto(photoId: string): Promise<{ 
    source: 'audit_log' | 'system_log' | 'metadata'; 
    data: typeof aiAuditLogs.$inferSelect | typeof systemLogs.$inferSelect | Record<string, unknown> 
} | null> {
    // 1. Try ai_audit_logs
    let auditLog: typeof aiAuditLogs.$inferSelect | undefined = undefined;
    if (!photoId.startsWith('temp-')) {
        auditLog = await db.query.aiAuditLogs.findFirst({
            where: eq(aiAuditLogs.photoId, photoId),
            orderBy: [desc(aiAuditLogs.createdAt)]
        });
    }

    if (!auditLog) {
        const fallbackLogs = await db.select()
            .from(aiAuditLogs)
            .where(sql`cleaned_output->>'_failedConstraintPhotoId' = ${photoId}`)
            .orderBy(desc(aiAuditLogs.createdAt))
            .limit(1);
        if (fallbackLogs.length > 0) {
            auditLog = fallbackLogs[0];
        }
    }

    if (auditLog) return { source: 'audit_log', data: auditLog };

    // 2. Fallback to system_logs
    let rawLogs: Array<typeof systemLogs.$inferSelect> = await db.select()
        .from(systemLogs)
        .where(sql`${systemLogs.operation} = 'AI_Executor' AND ${systemLogs.message} = ${`AI analysis completed for photo ${photoId}`}`)
        .orderBy(desc(systemLogs.createdAt))
        .limit(1);

    if (!rawLogs || rawLogs.length === 0) {
        rawLogs = await db.select()
            .from(systemLogs)
            .where(sql`${systemLogs.operation} = 'AI_Executor' AND (metadata->>'photo_id') = ${photoId}`)
            .orderBy(desc(systemLogs.createdAt))
            .limit(1);
    }

    if (rawLogs && rawLogs.length > 0) return { source: 'system_log', data: rawLogs[0] };

    // 3. Last fallback: metadata
    if (!photoId.startsWith('temp-')) {
        const item = await db.query.furnitureItems.findFirst({
            columns: { metadata: true },
            where: eq(furnitureItems.id, photoId)
        });
        if (item?.metadata && (item.metadata as Record<string, unknown>).ai_raw) {
            return { source: 'metadata', data: item.metadata as Record<string, unknown> };
        }
    }

    return null;
}

export async function upsertPhoto(payload: typeof furnitureItems.$inferInsert) {
    const { id, ...updatePayloadData } = payload;
    const updatePayload = {
        ...updatePayloadData,
        updatedAt: new Date()
    };

    return await db.insert(furnitureItems)
        .values([payload])
        .onConflictDoUpdate({
            target: furnitureItems.id,
            set: updatePayload as typeof furnitureItems.$inferInsert
        })
        .returning({ id: furnitureItems.id });
}

export async function createAiAuditLog(payload: typeof systemLogs.$inferInsert) {
    return await db.insert(systemLogs).values(payload).returning();
}
