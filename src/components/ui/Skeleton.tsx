import React from 'react';
import { motion } from 'motion/react';

export const Skeleton: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => (
  <motion.div 
    initial={{ opacity: 0.3 }}
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    className={`bg-brand-navy/10 rounded-md ${className}`}
  >
    {children}
  </motion.div>
);

export const PhotoCardSkeleton: React.FC = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="aspect-square w-full bg-brand-navy/5 rounded-xl overflow-hidden relative border border-brand-navy/[0.03]"
  >
    {/* Shimmer effect Overlay */}
    <motion.div 
      animate={{ x: ['100%', '-100%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
    />

    {/* Image Placeholder */}
    <div className="absolute inset-0 bg-brand-navy/5 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-brand-navy/5 animate-pulse" />
    </div>

    {/* Text Placeholders */}
    <div className="absolute bottom-0 left-0 w-full p-3 space-y-2 bg-gradient-to-t from-brand-navy/10 to-transparent">
      <div className="h-4 w-3/4 bg-brand-navy/10 rounded-full animate-pulse" />
      <div className="flex gap-2">
        <div className="h-2 w-12 bg-brand-navy/5 rounded-full animate-pulse" />
        <div className="h-2 w-12 bg-brand-navy/5 rounded-full animate-pulse" />
      </div>
    </div>
  </motion.div>
);
