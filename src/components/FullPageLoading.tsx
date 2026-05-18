import React from 'react';
import { motion } from 'motion/react';

export const FullPageLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-brand-bg">
      <div className="relative">
        {/* Outer ring */}
        <motion.div 
          className="w-16 h-16 border-4 border-brand-navy/5 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        {/* Spinning accent */}
        <motion.div 
          className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-brand-gold rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      <motion.div 
        className="mt-6 flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-black text-brand-navy uppercase tracking-widest">
            正在載入 / Loading
        </h2>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div 
              key={i}
              className="w-1.5 h-1.5 bg-brand-gold/60 rounded-full"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
