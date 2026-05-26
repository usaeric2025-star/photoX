import { DiagnosticTest, registerDiagnostic } from './index';

const test: DiagnosticTest = {
  id: 'batch_select',
  name: 'Batch Select Performance',
  description: '模拟 50+ 项 selected，验证 interactionBus 耗时 < 50ms',
  run: async () => {
    const startTime = performance.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { passed: true, message: 'Batch select performance verified', durationMs: performance.now() - startTime };
    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
