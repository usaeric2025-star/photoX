/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './photo';
export * from './api';

export interface Task {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'cancelled' | 'warning';
  progress?: number;
  message?: string;
  onCancel?: () => void;
}

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
}

export interface AppSettings {
  logo_url?: string;
  pinnedTags?: string[];
  hotTagsCount?: number;
  gemini_api_key?: string;
  custom_model?: string;
  provider?: string;
  whatsapp_1_name?: string;
  whatsapp_1?: string;
  whatsapp_2_name?: string;
  whatsapp_2?: string;
  access_passcode?: string;
}

export interface AppError {
  message: string;
  context?: string;
  timestamp: number;
  type?: string;
}

export interface DialogData {
  title: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  onSubmit?: (val: string) => void;
  placeholder?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export interface AppState {
  photos: import('./photo').Photo[];
  categories: import('./photo').Category[];
  tags: import('./photo').Tag[];
}
