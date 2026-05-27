import React from 'react';
import { AISecuritySection } from './AISecuritySection';
import { AppSettings } from '@/types';

interface AISettingsProps {
  geminiApiKey: string | undefined;
  setGeminiApiKey: (key: string) => void;
  customModel: string;
  setCustomModel: (model: string) => void;
  testConnection: () => Promise<void>;
  testResult: { success?: boolean; error?: string; loading?: boolean } | null;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: (field: keyof AppSettings, value: any) => void;
  cardClass: string;
  inputClass: string;
}

export const AISettings: React.FC<AISettingsProps> = (props) => {
  return <AISecuritySection {...props} geminiApiKey={props.geminiApiKey || ''} />;
};
