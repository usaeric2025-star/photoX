import React from 'react';
import { Router } from '@/router';
import { AppLink } from '@/components/router/AppLink';
import { Icon } from '@/components/ui/Icon';

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Icon name="file-question" size={32} className="text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">PAGE NOT FOUND</h1>
        <p className="text-slate-500 mb-8 max-w-xs">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <AppLink 
          to={Router.home()}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium tracking-wide hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          <Icon name="home" size={18} />
          Return to Home
        </AppLink>
      </div>
    </div>
  );
};
