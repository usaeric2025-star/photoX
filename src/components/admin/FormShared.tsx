import React, { useState } from 'react';
import { Category } from '../../types';
import { useLongPress } from '../../hooks/useLongPress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const FormSectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, onAction, actionLabel }) => (
  <div className="flex items-center justify-between px-1 mb-3">
    <div className="flex flex-col">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {title} {subtitle && <span className="text-slate-300 ml-1">/ {subtitle}</span>}
        </h3>
    </div>
    {onAction && (
      <button 
        onClick={onAction}
        className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 active:bg-blue-100 transition-colors"
      >
        {actionLabel || '+ 新增'}
      </button>
    )}
  </div>
);

interface CategorySelectorProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  appLang: string;
}

export const CategoryGrid: React.FC<CategorySelectorProps> = ({ categories, selectedId, onSelect, appLang }) => (
  <div className="grid grid-cols-4 gap-1.5 px-0.5">
    {categories.filter(cat => cat && cat.id).map((cat: any) => {
      const isSelected = String(selectedId || '') === String(cat.id || '');
      const displayName = appLang === 'zh' ? (cat.zh || cat.name) : appLang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
      return (
        <button 
          key={cat.id}
          onClick={() => onSelect(isSelected ? null : String(cat.id))}
          className={`flex flex-col items-center justify-center py-4 px-1 rounded-xl border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20' : 'bg-white border-slate-100 active:bg-slate-50'}`}
        >
          <span className={`font-black text-[10px] leading-tight text-center uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-slate-700'}`}>
            {displayName}
          </span>
        </button>
      );
    })}
  </div>
);

interface ManufacturerSelectorProps {
  manufacturers: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit?: (mfr: any) => void;
  onDelete?: (mfr: any) => void;
}

export const ManufacturerList: React.FC<ManufacturerSelectorProps> = ({ manufacturers, selectedId, onSelect, onEdit, onDelete }) => {
    const { startPress, endPress, cancelPress, handleTouchMove, activeItem: activeActionMfr, setActiveItem: setActiveActionMfr } = useLongPress(
        (mfr) => { if (onEdit || onDelete) setActiveActionMfr(mfr); }
    );

    return (
        <>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto content-start px-0.5 no-scrollbar">
                {(manufacturers || []).map((mfr: any) => {
                const isSelected = String(selectedId || '') === String(mfr.id || '');
                return (
                    <button 
                    key={mfr.id}
                    onMouseDown={(e) => startPress(mfr, e)}
                    onMouseUp={endPress}
                    onMouseLeave={cancelPress}
                    onTouchStart={(e) => startPress(mfr, e)}
                    onTouchEnd={endPress}
                    onTouchMove={handleTouchMove}
                    onTouchCancel={cancelPress}
                    onClick={() => onSelect(isSelected ? null : String(mfr.id))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white border-slate-200 text-slate-600 active:bg-slate-50'}`}
                    >
                    {mfr.name}
                    </button>
                );
                })}
            </div>
            {activeActionMfr && (
                <AlertDialog open={!!activeActionMfr} onOpenChange={() => setActiveActionMfr(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>管理厂商: {activeActionMfr.name}</AlertDialogTitle>
                            <AlertDialogDescription>请选择操作</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => { onEdit?.(activeActionMfr); setActiveActionMfr(null); }}>
                                <Pencil size={16} className="mr-2" /> 编辑
                            </AlertDialogAction>
                            <AlertDialogAction className="bg-red-600" onClick={() => { onDelete?.(activeActionMfr); setActiveActionMfr(null); }}>
                                <Trash2 size={16} className="mr-2" /> 删除
                            </AlertDialogAction>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};
