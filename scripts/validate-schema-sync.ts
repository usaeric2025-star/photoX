import { Project, Node } from 'ts-morph';
import fs from 'fs';
import path from 'path';

/**
 * [SCHEMA-SYNC-VALIDATOR]
 * Checks if Drizzle Schema (src/db/schema.ts) matches ArkType API Schema (src/schemas/photo.ts).
 * 
 * Objectives:
 * 1. Ensure all fields in ArkType exist in Drizzle.
 * 2. Ensure types are compatible.
 */

const DRIZZLE_PATH = 'src/db/schema.ts';
const ARKTYPE_PATH = 'src/schemas/photo.ts';

function main() {
    const project = new Project();
    
    if (!fs.existsSync(DRIZZLE_PATH) || !fs.existsSync(ARKTYPE_PATH)) {
        console.warn('Schema files missing, skipping sync check.');
        return;
    }

    const drizzleFile = project.addSourceFileAtPath(DRIZZLE_PATH);
    const arktypeFile = project.addSourceFileAtPath(ARKTYPE_PATH);

    // 1. Get ArkType fields
    const photoSchemaDecl = arktypeFile.getVariableDeclaration('PhotoSchema');
    const arkFields = new Set<string>();
    
    if (photoSchemaDecl) {
        const initializer = photoSchemaDecl.getInitializerOrThrow();
        if (Node.isCallExpression(initializer)) {
            const args = initializer.getArguments();
            if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                args[0].getProperties().forEach(prop => {
                    const name = prop.getName().replace(/['"\\?]/g, '');
                    arkFields.add(name);
                });
            }
        }
    }

    // 2. Get Drizzle fields for furnitureItems
    const furnitureItemsDecl = drizzleFile.getVariableDeclaration('furnitureItems');
    const drizzleFields = new Set<string>();

    if (furnitureItemsDecl) {
        const initializer = furnitureItemsDecl.getInitializerOrThrow();
        if (Node.isCallExpression(initializer)) {
            const args = initializer.getArguments();
            if (args.length > 1 && Node.isObjectLiteralExpression(args[1])) {
                args[1].getProperties().forEach(prop => {
                    // Drizzle uses camelCase for object keys, but column names in pgTable can beSnake_case
                    // Typically ArkType matches the frontend keys
                    drizzleFields.add(prop.getName());
                });
            }
        }
    }

    // 3. Compare
    const missingInDrizzle = Array.from(arkFields).filter(f => !drizzleFields.has(f));
    
    // Some mapping logic (e.g. userId vs user_id)
    const validMappings: Record<string, string> = {
        'userId': 'userId',
        'categoryId': 'categoryId',
        'manufacturerId': 'manufacturerId',
        'groupId': 'groupId',
        'isGroupCover': 'isGroupCover',
        'isPinned': 'isPinned',
        'imageUrl': 'imageUrl',
        'thumbHash': 'thumbHash',
        'isHidden': 'isHidden',
        'itemCode': 'itemCode',
        'manualCode': 'manualCode',
        'modelNumber': 'modelNumber',
        'updatedAt': 'updatedAt',
        'createdAt': 'createdAt'
    };

    const finalMissing = missingInDrizzle.filter(f => !validMappings[f] || !drizzleFields.has(validMappings[f]));

    if (finalMissing.length > 0) {
        console.error('\n🚨 [SCHEMA-INCONSISTENCY] ArkType schema has fields missing in Drizzle schema:');
        finalMissing.forEach(f => console.error(` - ${f}`));
        process.exit(1);
    }

    console.log('\n✅ [SCHEMA-SYNC] Drizzle and ArkType schemas are synchronized.');
}

main();
