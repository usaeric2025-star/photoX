export type DiagnosticSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type DiagnosticCategory = 'integrity' | 'consistency' | 'file' | 'logic';

export interface DiagnosticIssue {
  id: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  title: string;
  description: string;
  affectedCount: number;
  sampleIds: string[];
  autoFixable: boolean;
}

export interface DiagnosticsReport {
  timestamp: number;
  totalIssues: number;
  issuesBySeverity: Record<DiagnosticSeverity, number>;
  issues: DiagnosticIssue[];
}
