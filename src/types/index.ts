/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as v from 'valibot';
import { 
  TagSchema as ApiTagSchema, 
  DimensionSchema as ApiDimensionSchema 
} from '../../api/_shared/apiContractSchema';

// --- Base Types ---
export const IdSchema = v.pipe(v.string(), v.uuid());

export const JsonObjectSchema = v.record(v.string(), v.unknown());

// --- Sub-types (re-using API contract) ---
export const TagSchema = ApiTagSchema;
export const DimensionSchema = ApiDimensionSchema;

// --- API Types ---
export const MergeGroupsRequestSchema = v.object({
  targetGroupId: IdSchema,
  sourceGroupIds: v.array(IdSchema),
});
type MergeGroupsRequest = v.InferOutput<typeof MergeGroupsRequestSchema>;

export const MergeGroupsResponseSchema = v.object({
  success: v.boolean(),
  targetGroupId: IdSchema,
  mergedCount: v.number(),
});
type MergeGroupsResponseType = v.InferOutput<typeof MergeGroupsResponseSchema>;

// --- Existing Utility Types ---
type JsonValue = string | number | boolean | null | Record<string, unknown> | JsonValue[];
type AnyFunction = (...args: unknown[]) => unknown;
type AnyArray = unknown[];

export * from './photo';
export * from './api';
export * from './tasks';

import { translations } from '@/locales';
export type TranslationType = typeof translations['en'];

// ... rest of the file

interface Task {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'cancelled' | 'warning';
  progress?: number;
  message?: string;
  onCancel?: () => void;
  finished_at?: number;
}

export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  avatar_url?: string | null;
  email_verified: boolean;
}

export interface AppSettings extends Record<string, unknown> {
  app_name?: string;
  logo_url?: string;
  pinned_tags?: string[];
  hot_tags_count?: number;
  hot_tag_threshold?: number;
  agnes_api_key?: string;
  custom_model?: string;
  provider?: string;
  whatsapp_1_name?: string;
  whatsapp_1?: string;
  whatsapp_2_name?: string;
  whatsapp_2?: string;
  facebook?: string;
  instagram?: string;
  access_passcode?: string;
  manufacturers?: import('./photo').Manufacturer[];
  tags?: import('./photo').Tag[];
}

interface DialogData {
  title: string;
  message?: string | React.ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  onSubmit?: (val: string) => void | Promise<void>;
  placeholder?: string;
  defaultValue?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    type?: 'info' | 'warning' | 'danger' | 'success';
  };
}

interface AppState {
  photos: import('./photo').Photo[];
  categories: import('./photo').Category[];
  tags: import('./photo').Tag[];
}
