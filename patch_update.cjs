const fs = require('fs');
let code = fs.readFileSync('api/_handlers/photos/update.ts', 'utf8');

code = code.replace(
    "import { db, furnitureItems, groups as groupsTable, categories, manufacturers } from '../../_lib/db/index.js';",
    "import { db, furnitureItems, groups as groupsTable, categories, manufacturers, photoTags } from '../../_lib/db/index.js';"
);

const target = `        if (Object.keys(mappedUpdates).length === 0) {
            return successResponse(c, ids);
        }

        const data = await db
            .update(furnitureItems)
            .set(mappedUpdates)
            .where(inArray(furnitureItems.id, ids))
            .returning({ id: furnitureItems.id });`;

const replacement = `        // Handle tags bulk update if present
        if (updates.tags && Array.isArray(updates.tags)) {
            const tagIds = updates.tags.map(String).map(Number).filter(n => !isNaN(n));
            
            await db.transaction(async (tx) => {
                // Delete old tags for these photos
                await tx.delete(photoTags).where(inArray(photoTags.photoId, ids));
                
                // Insert new tags
                if (tagIds.length > 0) {
                    const tagInsertValues = [];
                    for (const pid of ids) {
                        for (const tid of tagIds) {
                            tagInsertValues.push({ photoId: pid, tagId: tid });
                        }
                    }
                    if (tagInsertValues.length > 0) {
                        await tx.insert(photoTags).values(tagInsertValues);
                    }
                }
                
                if (Object.keys(mappedUpdates).length > 0) {
                    await tx.update(furnitureItems)
                        .set(mappedUpdates)
                        .where(inArray(furnitureItems.id, ids));
                }
            });
        } else if (Object.keys(mappedUpdates).length > 0) {
            await db.update(furnitureItems)
                .set(mappedUpdates)
                .where(inArray(furnitureItems.id, ids));
        }

        const data = ids.map(id => ({ id }));`;

code = code.replace(target, replacement);
fs.writeFileSync('api/_handlers/photos/update.ts', code);
