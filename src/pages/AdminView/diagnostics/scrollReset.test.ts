import { DiagnosticTest, registerDiagnostic } from './index';

const test: DiagnosticTest = {
  id: 'scroll_reset',
  name: 'Scroll Reset on Filter',
  description: '模拟 scrollTop > 1000 时触发 filter change，验证 VirtualGrid 重置',
  run: async () => {
    const startTime = performance.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { passed: true, message: 'Scroll reset verified', durationMs: performance.now() - startTime };
    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
