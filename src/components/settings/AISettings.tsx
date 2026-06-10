import React from 'react';
import { AISecuritySection } from './AISecuritySection';
import { AppSettings } from '@/types';

interface AISettingsProps {
  geminiApiKey: string | undefined;
  setGeminiApiKey: (key: string) => void;
  customModel: string;
  testConnection: () => Promise<void>;
  testResult: { success?: boolean; error?: string; loading?: boolean } | null;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: (field: keyof AppSettings, value: any) => void;
  cardClass: string;
  inputClass: string;
}

export function AISettings(props: AISettingsProps) {
  const { geminiApiKey, customModel, ...rest } = props;
  return <AISecuritySection {...rest} geminiApiKey={geminiApiKey || ''} customModel={customModel || ''} />;
};
