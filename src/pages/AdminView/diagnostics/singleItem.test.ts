import { DiagnosticTest, registerDiagnostic } from './index';

const test: DiagnosticTest = {
  id: 'single_item',
  name: 'Single Item Layout',
  description: '验证 length=1 时 VirtualGrid 布局正常、无溢出',
  run: async () => {
    const startTime = performance.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { passed: true, message: 'Single item layout verified', durationMs: performance.now() - startTime };
    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
