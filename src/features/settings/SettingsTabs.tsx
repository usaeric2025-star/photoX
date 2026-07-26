import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const text = useSettingsText();

  const tabs = [
    { id: 'general', label: text.tabs.general, icon: 'Settings', subLabel: 'General' },
    { id: 'ai', label: text.tabs.ai, icon: 'Cpu', subLabel: 'AI Engine' },
    { id: 'assets', label: text.tabs.assets, icon: 'layout-grid', subLabel: 'Assets' },
    { id: 'status', label: text.tabs.status, icon: 'Activity', subLabel: 'Health' },
  ] as const;

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 px-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-[28px] min-w-[100px] border-2 transition-all ${
              isActive 
                ? 'bg-brand-navy border-brand-navy text-white shadow-lg scale-105' 
                : 'bg-white border-brand-navy/5 text-brand-navy/60 hover:border-brand-navy/10 active:scale-95'
            }`}
          >
            <Icon name={tab.icon} size={20} className={isActive ? 'text-brand-gold' : 'text-brand-navy/40'} />
            <span className="text-[10px] font-black uppercase tracking-tighter mt-1">{tab.label}</span>
            <span className="text-[8px] opacity-40 font-bold uppercase tracking-widest">{tab.subLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
