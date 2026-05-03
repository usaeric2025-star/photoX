import React, { useState, useRef } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ManufacturerProps {
  manufacturer: { id: string | number, name: string };
  onUpdate: (mfr: any) => void;
  onDelete: (id: string | number) => void;
}

export const ManufacturerItem = ({ manufacturer, onUpdate, onDelete }: ManufacturerProps) => {
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      setIsPressing(false);
      setActiveMenuId(manufacturer.id);
    }, 600);
  };

  const handleEnd = () => {
    setIsPressing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div 
      className={`bg-white border border-[#1D3557]/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${isPressing || activeMenuId === manufacturer.id ? 'bg-[#D4A853]/10 border-[#D4A853]/30 scale-95' : ''}`}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        setActiveMenuId(manufacturer.id);
      }}
    >
      <span className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight select-none">
        {manufacturer.name}
      </span>

      <AnimatePresence>
        {activeMenuId === manufacturer.id && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1D3557] rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-[101] min-w-[120px]"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(manufacturer);
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2">
                  <Trash2 size={12} /> 删除
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定要删除生产商 #{manufacturer.name} 吗？</AlertDialogTitle>
                  <AlertDialogDescription>此操作不可撤销。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>关闭</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(manufacturer.id)}>删除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div 
              className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1D3557] rotate-45 -mt-1"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {activeMenuId === manufacturer.id && (
        <div 
          className="fixed inset-0 z-[100]" 
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuId(null);
          }}
        />
      )}
    </div>
  );
};
