import React, { useState } from 'react';
import { Cloud, Cog, LayoutGrid, Info } from 'lucide-react';

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const tabs = [
    { id: 'cloud', label: '云端与同步', icon: Cloud, subLabel: 'Cloud & Sync' },
    { id: 'app', label: '基础与 AI', icon: Cog, subLabel: 'General & AI' },
    { id: 'content', label: '目录与标签', icon: LayoutGrid, subLabel: 'Content' },
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 px-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
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
            <Icon size={20} className={isActive ? 'text-brand-gold' : 'text-brand-navy/40'} />
            <span className="text-[10px] font-black uppercase tracking-tighter mt-1">{tab.label}</span>
            <span className="text-[8px] opacity-40 font-bold uppercase tracking-widest">{tab.subLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
