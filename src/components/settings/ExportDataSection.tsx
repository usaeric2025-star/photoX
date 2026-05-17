import React from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Category, Tag, Photo, Manufacturer, User } from '../../../types';

interface ExportDataSectionProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  isSyncing: boolean;
  user: User | null;
  cardClass: string;
  buttonStyles: { [key in 'primary' | 'secondary' | 'accent']: string };
  handleDeduplicate: () => Promise<void>;
}

export const ExportDataSection: React.FC<ExportDataSectionProps> = ({
  photos, categories, tags, manufacturers, isSyncing, user, cardClass, buttonStyles, handleDeduplicate
}) => {
  return (
    <div className={cardClass}>
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-slate-800 rounded-full"></div>
          数据维护
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleDeduplicate}
            disabled={isSyncing || !user}
            className={buttonStyles.accent + " col-span-2"}
          >
            <Trash2 size={16} /> 排重清理 / Clean Duplicates
          </button>
          <button 
            onClick={() => {
              const data = JSON.stringify({ photos, categories, tags, manufacturers });
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `furniture_backup_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className={buttonStyles.primary}
          >
            导出 JSON
          </button>
          <label className={buttonStyles.secondary + " cursor-pointer"}>
            <input 
              type="file" 
              className="hidden" 
              accept="application/json" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    JSON.parse(event.target?.result as string);
                    toast.error('JSON 导入目前仅支持手动查看，不支持批量写入云端。');
                  } catch (err) {
                    console.error('导入JSON失败', err);
                  }
                };
                reader.readAsText(file);
              }}
            />
            导入 JSON
          </label>
        </div>
      </div>
  );
};
