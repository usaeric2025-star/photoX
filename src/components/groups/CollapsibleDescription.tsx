import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function CollapsibleDescription({ description, title }: { description: string, title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!description) return null;
  
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-slate-50/50 bg-slate-50/30">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
           {title}
        </h3>
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors bg-white rounded-full p-1 border border-slate-100 shadow-sm">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            transition={{ duration: 0.2 }}
          >
            <div className="pt-3 text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap font-sans">
               {description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
