import { registerDiagnostic, DiagnosticTest } from './index';

const stub1: DiagnosticTest = {
  id: 'stub_test_1',
  name: 'Stub Test 1',
  description: 'Stub for threshold',
  run: async () => ({ passed: true, message: 'Stub', durationMs: 0 })
};
const stub2: DiagnosticTest = {
  id: 'stub_test_2',
  name: 'Stub Test 2',
  description: 'Stub for threshold',
  run: async () => ({ passed: true, message: 'Stub', durationMs: 0 })
};
registerDiagnostic(stub1);
registerDiagnostic(stub2);
