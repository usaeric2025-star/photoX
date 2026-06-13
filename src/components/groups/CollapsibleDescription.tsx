import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
      
      <div 
        className={`grid transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-0">
             {description}
          </div>
        </div>
      </div>
    </div>
  );
}
