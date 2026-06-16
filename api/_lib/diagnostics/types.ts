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

export interface DBRecord extends Record<string, unknown> {
  id: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DiagnosticContext {
   supabase: SupabaseClient;
   photos: any[];
   groups: any[];
   categories: any[];
   manufacturers: any[];
   photoTags: any[];
}

export type DiagnosticDependency = 'photos' | 'groups' | 'categories' | 'manufacturers' | 'photoTags';

export interface DiagnosticTask {
  id: string;
  deps: DiagnosticDependency[];
  run: (ctx: DiagnosticContext) => Promise<DiagnosticIssue | null>;
  repair?: (ctx: DiagnosticContext) => Promise<{ success: boolean; message: string }>;
}
