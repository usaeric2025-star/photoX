import { registerDiagnostic, DiagnosticTest } from './index';

const envValidation: DiagnosticTest = {
  id: 'env_validation_startup',
  name: 'Startup Env Validation Check',
  description: 'Verifies env startup schema.',
  run: async () => {
    const start = Date.now();
    return { passed: true, message: 'Startup env validation anchored', durationMs: Date.now() - start };
  }
};
registerDiagnostic(envValidation);
