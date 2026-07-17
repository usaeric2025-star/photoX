/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as v from 'valibot';

// --- Existing Utility Types ---
type JsonValue = string | number | boolean | null | Record<string, unknown> | JsonValue[];
type AnyFunction = (...args: unknown[]) => unknown;
type AnyArray = unknown[];

export * from './photo.js';
export * from './api.js';
export * from './tasks.js';

import { translations } from '#src/locales/index.js';
type TranslationType = typeof translations['en'];

interface Task {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'cancelled' | 'warning';
  progress?: number;
  message?: string;
  onCancel?: () => void;
  finishedAt?: number;
}

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
}

export interface AppSettings {
  appName?: string;
  logoUrl?: string;
  pinnedTags?: string[];
  hotTagsCount?: number;
  hotTagThreshold?: number;
  agnesApiKey?: string;
  whatsapp1Name?: string;
  whatsapp1?: string;
  whatsapp2Name?: string;
  whatsapp2?: string;
  accessPasscode?: string;
  manufacturers?: import('./photo.js').Manufacturer[];
  tags?: import('./photo.js').Tag[];
  [key: string]: unknown;
}

interface DialogData {
  title: string;
  message?: string | React.ReactNode;
  onConfirm?: () => void | Promise<void>;
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

export interface Theme {
  bg: string;
  logoColor: string;
  logoText: string;
  button: string;
  buttonActive: string;
  badge: string;
  badgeLabel: string;
  badgeVal: string;
  popoverTrigger: string;
}

interface AppState {
  photos: import('./photo.js').Photo[];
  categories: import('./photo.js').Category[];
  tags: import('./photo.js').Tag[];
}
