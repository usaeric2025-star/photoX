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
    <section className="bg-white rounded-2xl border border-slate-100/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Briefcase size={12} className="text-slate-400" /> {texts.metadata}
        </span>
      </div>
      <div className="p-5 space-y-5">
        {/* Codes */}
        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
          {/* System ID / 系統內部編號 */}
          <div className="col-span-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">{texts.systemId}</span>
            <CopyableId className="bg-slate-50 p-2 rounded-md border border-slate-100 w-fit" id={photo.id} />
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">{texts.itemCode}</span>
            <span className="text-sm font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded-md">{photo.item_code || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">{texts.modelNumber}</span>
            <span className="text-sm font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded-md">{photo.model_number || '-'}</span>
          </div>
          
          {/* Price */}
          <div className="col-span-2 flex justify-between bg-slate-800 p-4 rounded-xl shadow-md text-white">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.priceOrCode}</span>
              <span className="text-base font-semibold tracking-wide">
                {[photo.price ? `RM ${photo.price}` : '', photo.manual_code].filter(Boolean).join(' • ') || '-'}
              </span>
            </div>
            {photo.width ? (
               <div className="text-right flex flex-col justify-end">
                 <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{texts.imgSize}</span>
                 <span className="text-xs font-mono text-slate-300 bg-black/20 px-2 py-1 rounded-md">{photo.width} × {photo.height}</span>
               </div>
            ) : null}
          </div>
          
          {/* Manufacturer */}
          <div className="col-span-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">{texts.manufacturer}</span>
            <span className="text-sm font-medium text-slate-900">{manufacturerName || '-'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
