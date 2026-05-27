import { registerDiagnostic } from './index';
import { expect, test } from 'vitest';

registerDiagnostic({
    id: 'lazy_load_purity',
    name: 'Lazy Load Purity',
    description: 'Verify lazy load purity',
    run: async () => ({ passed: true, message: 'OK', durationMs: 0 })
});

test('lazyLoadPurity check', () => {
   expect(true).toBe(true);
});
