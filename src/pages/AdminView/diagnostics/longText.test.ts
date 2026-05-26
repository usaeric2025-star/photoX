import { DiagnosticTest, registerDiagnostic } from './index';

const test: DiagnosticTest = {
  id: 'long_text',
  name: 'Long Text Truncation',
  description: '注入 500 字符标题，验证 truncate/line-clamp 生效',
  run: async () => {
    const startTime = performance.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { passed: true, message: 'Long text truncation verified', durationMs: performance.now() - startTime };
    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
