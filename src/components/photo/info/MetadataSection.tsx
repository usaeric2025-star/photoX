import React from 'react';
import { Briefcase } from 'lucide-react';
import { Photo } from '@/types/photo';

import { CopyableId } from '@/components/ui/CopyableId';

interface MetadataSectionProps {
  photo: Photo;
  manufacturerName?: string;
  texts: {
    metadata: string;
    systemId: string;
    itemCode: string;
    modelNumber: string;
    priceOrCode: string;
    imgSize: string;
    manufacturer: string;
  };
}

export function MetadataSection({ photo, manufacturerName, texts }: MetadataSectionProps) {
  return (
    <section className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Briefcase size={12} /> {texts.metadata}
        </span>
      </div>
      <div className="p-4 space-y-4">
        {/* Codes */}
        <div className="grid grid-cols-2 gap-4">
          {/* System ID / 系統內部編號 */}
          <div className="col-span-2 bg-white/60 hover:bg-white border border-slate-200/60 p-3 rounded-lg shadow-sm transition-colors">
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.systemId}</span>
            <CopyableId className="bg-slate-50/50 p-1.5 rounded border border-slate-200/30 w-fit" id={photo.id} />
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.itemCode}</span>
            <span className="text-sm font-mono font-semibold text-slate-900">{photo.item_code || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.modelNumber}</span>
            <span className="text-sm font-mono font-semibold text-slate-900">{photo.model_number || '-'}</span>
          </div>
          
          {/* Price */}
          <div className="col-span-2 flex justify-between bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.priceOrCode}</span>
              <span className="text-sm font-semibold text-slate-900">
                {[photo.price ? `$${photo.price}` : '', photo.manual_code].filter(Boolean).join(' • ') || '-'}
              </span>
            </div>
            {photo.width ? (
               <div className="text-right">
                 <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.imgSize}</span>
                 <span className="text-[11px] font-mono text-slate-600">{photo.width} × {photo.height}</span>
               </div>
            ) : null}
          </div>
          
          {/* Manufacturer */}
          <div className="col-span-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.manufacturer}</span>
            <span className="text-sm font-medium text-slate-900">{manufacturerName || '-'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
