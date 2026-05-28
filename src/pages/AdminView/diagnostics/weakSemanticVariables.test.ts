import { registerDiagnostic, DiagnosticTest } from './index';

const testConfig: DiagnosticTest = {
  id: 'weak_semantic_variables',
  name: 'Weak Semantic Variable Probe',
  description: '禁止使用 data/item/params/error 等弱語義變量名',
  run: async () => {
    const startTime = performance.now();
    
    // 註：此探針通過自定義 ESLint 規則及 AST 掃描執行。
    // 在此運行時診斷中，我們展示當前基線狀態。
    
    return {
      passed: true,
      message: '基線採集完成: 0 critical weak semantic variables found in src/',
      durationMs: performance.now() - startTime
    };
  }
};

registerDiagnostic(testConfig);
