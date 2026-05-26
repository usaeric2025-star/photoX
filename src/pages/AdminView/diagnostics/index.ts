/**
 * @remarks
 * Admin 稳定检测基础设施，仅开发/管理员环境可用
 */
export interface DiagnosticTest {
  id: string;
  name: string;
  description: string;
  run: () => Promise<{ passed: boolean; message: string; durationMs: number }>;
}

export const diagnosticRegistry: DiagnosticTest[] = [];

export function registerDiagnostic(test: DiagnosticTest): void {
  if (!diagnosticRegistry.find((t) => t.id === test.id)) {
    diagnosticRegistry.push(test);
  }
}


