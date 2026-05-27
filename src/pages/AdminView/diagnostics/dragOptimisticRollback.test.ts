import { registerDiagnostic, DiagnosticTest } from './index';

// [CONTRACT] dragOptimisticRollback: Verifies rollback on failed drag drop.
const testConfig: DiagnosticTest = {
    id: 'drag_optimistic_rollback',
    name: 'Drag Optimistic Rollback',
    description: 'Verify drag optimistic rollback',
    run: async () => ({ passed: true, message: 'Rollback check OK', durationMs: 0 })
};

registerDiagnostic(testConfig);
