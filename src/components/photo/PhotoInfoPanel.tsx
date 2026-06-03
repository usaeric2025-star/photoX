import React from 'react';
import { Photo, ProductGroup } from '@/types/photo';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  Tag as TagIcon, 
  Grid, 
  Maximize2, 
  Briefcase,
  Layers,
  Sparkles,
  Pencil,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PhotoInfoPanelProps {
  mode: 'single' | 'group';
  data: Photo | ProductGroup | any;
  showEdit?: boolean;
  showDelete?: boolean;
  showAi?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAiAnalyze?: () => void;
  className?: string;
}

export function PhotoInfoPanel({
  mode,
  data,
  showEdit,
  showDelete,
  showAi,
  onEdit,
  onDelete,
  onAiAnalyze,
  className
}: PhotoInfoPanelProps) {
  if (!data) return null;

  const isGroup = mode === 'group' && 'member_count' in data;
  
  return (
    <div className={cn("flex flex-col h-full bg-white/95 backdrop-blur-md border-l border-slate-200 overflow-y-auto no-scrollbar max-w-sm w-80", className)}>
      {/* Header with Actions */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 z-10">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          {isGroup ? <Layers size={18} className="text-brand-navy" /> : <Info size={18} className="text-brand-navy" />}
          {isGroup ? '合组详情' : '照片详情'}
        </h3>
        <div className="flex items-center gap-1">
          {showAi && !isGroup && (
            <Button variant="ghost" size="icon" onClick={onAiAnalyze} title="AI分析" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <Sparkles size={16} />
            </Button>
          )}
          {showEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} title="编辑" className="h-8 w-8 text-slate-600">
              <Pencil size={16} />
            </Button>
          )}
          {showDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} title="删除" className="h-8 w-8 text-red-600 hover:bg-red-50">
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-8">
        {isGroup ? (
          /* Group Mode View */
          <>
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Basic Info</h4>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{data.name}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 px-2.5 py-1">
                  <Grid size={12} className="mr-1.5 opacity-60" />
                  {data.member_count} 个成员
                </Badge>
              </div>
              {data.description && (
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                  "{data.description}"
                </p>
              )}
            </section>
          </>
        ) : (
          /* Single Photo Mode View */
          <>
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</h4>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{(data as Photo).name}</h2>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {(data as Photo).categoryName && (
                  <Badge variant="outline" className="bg-brand-navy/5 text-brand-navy border-brand-navy/10 px-2.5 py-1">
                    <Grid size={12} className="mr-1.5 opacity-60" />
                    {(data as Photo).categoryName}
                  </Badge>
                )}
                {(data as Photo).item_code && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 px-2.5 py-1 font-mono text-[10px]">
                    {(data as Photo).item_code}
                  </Badge>
                )}
              </div>
            </section>

            {/* Description */}
            {(data as Photo).description && (
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {(data as Photo).description}
                </p>
              </section>
            )}

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Dimensions</span>
                <div className="flex items-center gap-2 text-slate-700">
                  <Maximize2 size={14} className="opacity-40" />
                  <span className="text-xs font-semibold">
                    {(data as Photo).width} × {(data as Photo).height}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
                <div className="flex items-center gap-2 text-slate-700">
                  {(data as Photo).is_hidden ? (
                    <Badge variant="destructive" className="text-[9px] h-5">已隐藏</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-[9px] h-5">公开展示</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {(data as Photo).tagNames && (data as Photo).tagNames.length > 0 && (
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <TagIcon size={12} /> Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(data as Photo).tagNames.map((tag: string) => (
                    <span 
                      key={tag}
                      className="text-[10px] font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
