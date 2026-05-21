import React from 'react';
import { motion } from 'motion/react';

export const FullPageLoading: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-50"
    >
      <div className="text-slate-800">Loading...</div>
    </div>
  );
};
