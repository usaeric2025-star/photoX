/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type } from 'arktype';

// --- Base Types ---
export const IdSchema = type('string.uuid');

export const JsonObjectSchema = type('object');

// --- Sub-types ---
export const TagSchema = type({
  id: 'string',
  name: 'string',
  'aliases?': 'string[]',
});

export const DimensionSchema = type({
  width: 'number',
  height: 'number',
});

// --- API Types ---
export const MergeGroupsRequestSchema = type({
  targetGroupId: IdSchema,
  sourceGroupIds: IdSchema.array(),
});
export type MergeGroupsRequest = typeof MergeGroupsRequestSchema.infer;

export const MergeGroupsResponseSchema = type({
  success: 'boolean',
  targetGroupId: IdSchema,
  mergedCount: 'number',
});
export type MergeGroupsResponseType = typeof MergeGroupsResponseSchema.infer;

// --- Existing Utility Types ---
export type JsonValue = string | number | boolean | null | Record<string, unknown> | JsonValue[];
export type AnyFunction = (...args: unknown[]) => unknown;
export type AnyArray = unknown[];

export * from './photo';
export * from './api';
export * from './tasks';

import { translations } from '@/locales';
export type TranslationType = typeof translations['en'];

// ... rest of the file

export interface Task {
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
  access_passcode?: string;
}

export interface DialogData {
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

export interface AppState {
  photos: import('./photo').Photo[];
  categories: import('./photo').Category[];
  tags: import('./photo').Tag[];
}
