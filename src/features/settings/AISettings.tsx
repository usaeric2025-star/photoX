import React from 'react';
import { AISecuritySection } from './AISecuritySection.js';
import { AppSettings } from '#src/types/index.js';

interface AISettingsProps {
  agnesApiKey: string | undefined;
  setAgnesApiKey: (key: string) => void;
  testConnection: () => Promise<void>;
  testResult: { success?: boolean; error?: string; loading?: boolean } | null;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

export function AISettings(props: AISettingsProps) {
  const { agnesApiKey, ...rest } = props;
  return <AISecuritySection {...rest} agnesApiKey={agnesApiKey || ''} />;
};
