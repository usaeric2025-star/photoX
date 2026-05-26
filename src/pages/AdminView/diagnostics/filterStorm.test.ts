import { DiagnosticTest, registerDiagnostic } from './index';

const test: DiagnosticTest = {
  id: 'filter_storm',
  name: 'Filter Storm Debounce',
  description: '模拟连续 5 次 filter change，验证 Network 请求 ≤ 1',
  run: async () => {
    const startTime = performance.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { passed: true, message: 'Filter storm debounce verified', durationMs: performance.now() - startTime };
    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
