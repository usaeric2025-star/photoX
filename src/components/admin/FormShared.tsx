import { getTranslatedCategoryName } from '../../lib/ui-helpers';
import { createTranslate } from '@/lib/i18n';
import { translations, LanguageCode } from '../../lib/translations';
import { Category, Manufacturer } from '../../types';
import { useLongPress } from '@/hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { useGalleryStore } from '../../store';

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
    {categories.filter(cat => cat && cat.id).map((cat) => {
      const isSelected = String(selectedId || '') === String(cat.id || '');
      const dict = translations[appLang as LanguageCode] || translations.en;
      const displayName = getTranslatedCategoryName(cat.id || undefined, categories, appLang, dict);
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
  manufacturers: Manufacturer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit?: (mfr: Manufacturer) => void;
  onDelete?: (mfr: Manufacturer) => void;
}

export const ManufacturerList: React.FC<ManufacturerSelectorProps> = ({ manufacturers, selectedId, onSelect, onEdit, onDelete }) => {
    const { setAlertDialog } = useGalleryStore();
    const { startPress, endPress, cancelPress, handleTouchMove } = useLongPress<Manufacturer>(
        (mfr) => { 
            if (onEdit || onDelete) {
                setAlertDialog({
                    title: `管理厂商: ${mfr.name}`,
                    message: '请选择操作',
                    secondaryAction: {
                        label: '编辑',
                        onClick: () => onEdit?.(mfr)
                    },
                    onConfirm: () => onDelete?.(mfr),
                    confirmLabel: '删除',
                    type: 'danger'
                });
            }
        }
    );

    return (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto content-start px-0.5 no-scrollbar">
            {(manufacturers || []).map((mfr) => {
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
                {(mfr.name || '').toUpperCase()}
                </button>
            );
            })}
        </div>
    );
};
