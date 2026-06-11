import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function CollapsibleDescription({ description, title }: { description: React.ReactNode, title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!description) return null;
  
  return (
    <div className="w-full">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none hover:bg-black/[0.02] transition-colors group"
      >
        <span className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase group-hover:text-slate-500 transition-colors">
          {title}
        </span>
        <div className="text-slate-300 group-hover:text-slate-400 transition-transform duration-200">
          {isExpanded ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
        </div>
      </button>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">
               {description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
