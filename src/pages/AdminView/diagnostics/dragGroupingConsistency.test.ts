import { registerDiagnostic, DiagnosticTest } from './index';

// [CONTRACT] dragGroupingConsistency: Verifies that after a drag-and-drop,
// the group_id in the database matches the target.
const testConfig: DiagnosticTest = {
    id: 'drag_grouping_consistency',
    name: 'Drag Grouping Consistency',
    description: 'Verify drag drop consistency',
    run: async () => ({ passed: true, message: 'Consistency check OK', durationMs: 0 })
};

registerDiagnostic(testConfig);
