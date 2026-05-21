import React from 'react';
import { motion } from 'motion/react';

export const FullPageLoading: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-brand-bg/95 backdrop-blur-sm"
    >
      <div className="relative">
        {/* Main outer ring */}
        <motion.div 
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-4 border border-brand-navy/5 rounded-full" 
        />
        
        {/* Simple elegant ring */}
        <div className="w-16 h-16 border-2 border-brand-navy/5 rounded-full" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-brand-navy rounded-full"
        />
        
        {/* Core pulse */}
        <motion.div
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-brand-gold rounded-full shadow-[0_0_10px_rgba(var(--brand-gold-rgb),0.5)]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-8 flex flex-col items-center gap-2"
      >
        <span className="text-[12px] font-black tracking-[0.4em] text-slate-900 italic">
          PHOT<span className="text-blue-600">O</span>X
        </span>
        <div className="flex gap-1.5 h-1 items-center mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scaleY: [1, 2, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              className="w-4 h-0.5 bg-slate-900 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
