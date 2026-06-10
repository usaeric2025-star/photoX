import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function CollapsibleDescription({ description, title }: { description: string, title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!description) return null;
  
  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none hover:bg-slate-50/50 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase group-hover:text-slate-600 transition-colors">
              {title}
            </span>
          </div>
          <div className="text-slate-400 group-hover:text-slate-500 transition-transform duration-200">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-3 border-t border-slate-50">
                <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap font-sans">
                   {description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
