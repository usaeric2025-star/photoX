import { SupabaseClient } from "@supabase/supabase-js";

export type Severity = 'P0' | 'P1' | 'P2';

export interface DiagnosticIssue {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  affectedCount: number;
  sampleIds: string[];
  autoFixable: boolean;
}

export interface DiagnosticContext {
   supabase: SupabaseClient;
   photos: Record<string, unknown>[];
   groups: Record<string, unknown>[];
   categories: Record<string, unknown>[];
   manufacturers: Record<string, unknown>[];
   photoTags: Record<string, unknown>[];
}

export type DiagnosticDependency = 'photos' | 'groups' | 'categories' | 'manufacturers' | 'photoTags';

export interface DiagnosticTask {
  id: string;
  deps: DiagnosticDependency[];
  run: (ctx: DiagnosticContext) => Promise<DiagnosticIssue | null>;
  repair?: (ctx: DiagnosticContext) => Promise<{ success: boolean; message: string }>;
}
