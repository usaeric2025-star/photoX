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
        
        // Attempt to parse if it looks like JSON
        let parsedName: any = nameToProcess;
        if (typeof nameToProcess === 'string' && (nameToProcess.startsWith('{') || nameToProcess.startsWith('['))) {
            try {
                parsedName = JSON.parse(nameToProcess);
            } catch (e) {
                // Keep as is
            }
        }
        
        // Extract value if it is an object
        let finalName = (typeof parsedName === 'object' && parsedName !== null) ? 
            (parsedName.en || parsedName.zh || parsedName.name || '') : String(parsedName || '');
            
        // If it was already a string, it might have extra quotes from previous JSON.stringify
        if (typeof finalName === 'string') {
            finalName = finalName.replace(/^"|"$/g, '');
        }

        if (finalName !== row.name) {
            await db.update(furnitureItems)
                .set({ name: finalName })
                .where(eq(furnitureItems.id, row.id));
            console.log(`Updated ID: ${row.id}, New Name: ${finalName}`);
        }
    }
}

cleanup().catch(console.error);
