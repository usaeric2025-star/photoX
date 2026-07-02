import { db, furnitureItems } from '../api/_lib/db/index.js';
import { isNotNull, eq } from 'drizzle-orm';

async function cleanup() {
    console.log('Fetching all furniture items...');
    const allRows = await db.select({
        id: furnitureItems.id,
        name: furnitureItems.name
    })
    .from(furnitureItems)
    .where(isNotNull(furnitureItems.name));

    console.log(`Processing ${allRows.length} rows.`);

    for (const row of allRows) {
        let nameToProcess = row.name;
        
        let parsedName: any = nameToProcess;
        if (typeof nameToProcess === 'string') {
            try {
                if (nameToProcess.startsWith('{') || nameToProcess.startsWith('[')) {
                    parsedName = JSON.parse(nameToProcess);
                }
            } catch (e) {
                // Not JSON, keep as is
            }
        }
        
        // If we have an object, extract 'en'
        const newName = typeof parsedName === 'object' && parsedName !== null ? 
            (parsedName.en || parsedName.zh || '') : String(parsedName || '');
            
        if (newName !== nameToProcess) {
            // Stringify the name because it's a jsonb column
            await db.update(furnitureItems)
                .set({ name: JSON.stringify(newName) })
                .where(eq(furnitureItems.id, row.id));
            console.log(`Updated ID: ${row.id}, New Name: ${newName}`);
        }
    }
}

cleanup().catch(console.error);
