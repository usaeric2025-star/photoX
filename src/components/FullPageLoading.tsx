import React from 'react';
import { motion } from 'motion/react';

export const FullPageLoading: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white"
    >
      <div className="relative">
        {/* Simple elegant ring */}
        <div className="w-16 h-16 border-2 border-slate-50 rounded-full" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-brand-navy rounded-full"
        />
        
        {/* Floating small dot */}
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-brand-gold/40 rounded-full blur-sm"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 flex flex-col items-center gap-1.5"
      >
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-navy/40">
          PhotoX AI
        </span>
        <div className="flex gap-1.5 h-1 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                height: [2, 4, 2],
                opacity: [0.2, 0.6, 0.2]
              }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              className="w-0.5 bg-brand-navy rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
