import React from 'react';

export const AdminTabs = ({ activeTab }: { activeTab: string }) => {
  return (
    <nav className="flex space-x-4 border-b border-slate-200 p-4">
      {['overview', 'photos', 'groups', 'settings'].map((tab) => (
        <a 
          key={tab} 
          href={`/admin/${tab}`}
          className={`px-3 py-2 font-medium ${activeTab === tab ? 'text-brand-navy border-b-2 border-brand-navy' : 'text-slate-500'}`}
        >
          {tab.toUpperCase()}
        </a>
      ))}
    </nav>
  );
};
