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

export interface PhotoRecord extends DBRecord {
  image_url?: string;
  image_hash?: string;
  item_code?: string;
  group_id?: string;
  is_hidden?: boolean;
}

export interface GroupRecord extends DBRecord {
  name?: string;
  cover_photo_id?: string;
}

export interface CategoryRecord extends DBRecord {
  code: string;
  name_zh: string;
}

export interface ManufacturerRecord extends DBRecord {
  name: string;
}

export interface PhotoTagRecord extends DBRecord {
  photo_id: string;
  tag_id: string;
}

export interface DiagnosticContext {
  supabase: SupabaseClient;
  photos: PhotoRecord[];
  groups: GroupRecord[];
  categories: CategoryRecord[];
  manufacturers: ManufacturerRecord[];
  photoTags: PhotoTagRecord[];
}

export type DiagnosticDependency = 'photos' | 'groups' | 'categories' | 'manufacturers' | 'photoTags';

export interface DiagnosticTask {
  id: string;
  deps: DiagnosticDependency[];
  run: (ctx: DiagnosticContext) => Promise<DiagnosticIssue | null>;
  repair?: (ctx: DiagnosticContext) => Promise<{ success: boolean; message: string }>;
}
