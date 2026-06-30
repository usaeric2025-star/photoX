
import { db, groups as groupsTable, furnitureItems } from '@/api/_lib/db/index.js';
import { eq, and, inArray, sql, asc } from 'drizzle-orm';

export interface GroupListParams {
    isAdminMode?: boolean;
}

export async function getAllGroups(params: GroupListParams = {}) {
    const { isAdminMode = false } = params;
    let query = db.select().from(groupsTable).orderBy(asc(groupsTable.name));

    if (!isAdminMode) {
        return await db.select().from(groupsTable)
            .where(eq(groupsTable.status, 'confirmed'))
            .orderBy(asc(groupsTable.name));
    }

    return await query;
}

export async function getGroupById(id: string) {
    return await db.query.groups.findFirst({
        where: eq(groupsTable.id, id)
    });
}

export async function upsertGroup(cleanMapped: Record<string, any>) {
    const { id, ...updatePayloadData } = cleanMapped;

    const insertPayload = {
        ...cleanMapped,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const updatePayload = {
        ...updatePayloadData,
        updatedAt: new Date()
    };

    const [data] = await db.insert(groupsTable)
        .values(insertPayload as any)
        .onConflictDoUpdate({
            target: groupsTable.id,
            set: updatePayload as any
        })
        .returning();
    
    return data;
}

export async function deleteGroup(id: string) {
    return await db.delete(groupsTable).where(eq(groupsTable.id, id));
}
