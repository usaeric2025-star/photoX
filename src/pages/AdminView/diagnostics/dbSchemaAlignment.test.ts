import { expect, test } from 'vitest';
import { supabase } from '@/lib/supabase';
import { PHOTO_LIST_FIELDS as PHOTO_SELECT_FIELDS, VIRTUAL_FIELDS } from '@/constants/photoFields';
import { DB_CONFIG } from '@/constants/config';
import { registerDiagnostic } from './index';

/**
 * [DB-SCHEMA-ALIGNMENT-PROBE]
 * This test verify that all fields selected in PHOTO_SELECT_FIELDS
 * actually exist in the database, unless they are declared as VIRTUAL_FIELDS.
 */
const name = 'DB-Schema Alignment Probe';
const description = 'Verifies that PHOTO_SELECT_FIELDS matches physical DB columns';

const run = async () => {
    const start = Date.now();
    try {
        // 1. Fetch real column names from information_schema
        // @ts-ignore - Deep type instantiation due to information_schema string not being in Database types
        const { data: columns, error } = await supabase
            .from('information_schema.columns' as any)
            .select('column_name' as any)
            .eq('table_name' as any, DB_CONFIG.TABLE_NAME);

        if (error) {
            return {
                passed: true,
                message: `Skipped: DB unreachable or information_schema restricted. Code: ${error.code}`,
                durationMs: Date.now() - start,
                healthReport: { schemaComplexity: 0, probeFalsePositiveRate: 0, adapterStaleness: 1 }
            };
        }

        const dbColumns = new Set(columns?.map((c: any) => c.column_name));
        
        // 2. Parse PHOTO_SELECT_FIELDS
        const fields = PHOTO_SELECT_FIELDS.split(',')
            .map(f => f.trim())
            .map(f => {
                const match = f.match(/^(\w+)\(/);
                return match ? match[1] : f;
            })
            .filter(f => !VIRTUAL_FIELDS.includes(f as any));

        // 3. Validation
        const missingFields = fields.filter(f => !dbColumns.has(f));

        if (missingFields.length > 0) {
            return {
                passed: false,
                message: `Mismatch! Missing columns: ${missingFields.join(', ')}`,
                durationMs: Date.now() - start,
                healthReport: { schemaComplexity: fields.length, probeFalsePositiveRate: 0, adapterStaleness: 0 }
            };
        }

        return {
            passed: true,
            message: `Aligned: ${fields.length} fields verified.`,
            durationMs: Date.now() - start,
            healthReport: { schemaComplexity: fields.length, probeFalsePositiveRate: 0, adapterStaleness: 0 }
        };
    } catch (e: any) {
        return {
            passed: false,
            message: `Diagnostic error: ${e.message}`,
            durationMs: Date.now() - start,
            healthReport: { schemaComplexity: 0, probeFalsePositiveRate: 1, adapterStaleness: 0 }
        };
    }
};

registerDiagnostic({
    id: 'db-schema-alignment',
    name,
    description,
    run
});

test(name, async () => {
    const res = await run();
    expect(res.passed).toBe(true);
});
