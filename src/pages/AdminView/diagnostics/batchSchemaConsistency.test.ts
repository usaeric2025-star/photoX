import { registerDiagnostic, DiagnosticTest } from './index';
import { expect } from 'vitest';
import { photoBatchUpdateSchema } from '@/shared/apiContractSchema';
import { type } from 'arktype';

const batchResultConsistency: DiagnosticTest = {
  id: 'batch_result_consistency',
  name: 'Batch Update Schema Consistency Check',
  description: 'Verifies that batch update operations respect the independent isolation schema.',
  run: async () => {
    const start = Date.now();
    const payload = {
      items: [
        {
          id: 'uuid-1',
          updates: { category_id: 'cat-1', group_id: 'grp-1', is_hidden: false, item_code: 'A1' }
        }
      ]
    };
    const check = photoBatchUpdateSchema(payload);
    if (check instanceof type.errors) {
       return { passed: false, message: 'Invalid payload structure for batch updates', durationMs: Date.now() - start };
    }
    return { passed: true, message: 'Batch schema consistency verified', durationMs: Date.now() - start };
  }
};

registerDiagnostic(batchResultConsistency);
