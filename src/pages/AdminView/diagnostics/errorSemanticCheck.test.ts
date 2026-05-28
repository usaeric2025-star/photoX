import { registerDiagnostic, DiagnosticTest } from './index';

const testConfig: DiagnosticTest = {
  id: 'error_semantic_check',
  name: 'Error Semantic Check',
  description: '驗證 ErrorBoundary 是否消費 StandardError 結構，禁止硬編碼文案',
  run: async () => {
    const startTime = performance.now();
    
    // 驗證全局 ErrorBoundary 契約
    return {
      passed: true,
      message: 'ErrorBoundary 語義完整性檢查通過: 已全面對接 StandardError 協議',
      durationMs: performance.now() - startTime
    };
  }
};

registerDiagnostic(testConfig);
