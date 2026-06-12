import React from 'react';
import { ProductGroup } from '@/types/photo';
import { CopyableId } from '@/components/ui/CopyableId';
import { Badge } from '@/components/ui/badge';
import { Grid, Layers, Palette, Package } from 'lucide-react';
import { DimensionsSection } from './info/DimensionsSection';

interface GroupInfoSectionProps {
  data: ProductGroup;
  displayName: string;
  l: any;
  isAdmin: boolean;
  appLang: string;
  displayDesc?: string;
  rawDisplayName?: string;
}

export const GroupInfoSection = ({
  data,
  displayName,
  l,
  isAdmin,
  appLang,
  displayDesc,
  rawDisplayName
}: GroupInfoSectionProps) => {
  return (
    <div className="space-y-8">
      <section className="relative">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.basicInfo}</h4>
            <CopyableId 
              className="bg-transparent border-none text-brand-navy/60 font-semibold p-0" 
              id={isAdmin ? data.id : data.id.slice(-6).toUpperCase()} 
              label={isAdmin ? "GROUP ID" : "GROUP CODE"} 
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{displayName}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 px-2.5 py-1">
              <Grid size={12} className="mr-1.5 opacity-60" />
              {data.member_count}{l.members}
            </Badge>
          </div>
          
          {displayDesc && displayDesc.trim() !== displayName.trim() && displayDesc.trim() !== rawDisplayName?.trim() && (
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
              "{displayDesc}"
            </p>
          )}
        </section>

        {/* Materials & Colors */}
        {(data.materials?.length > 0 || data.colors?.length > 0) && (
          <section className="grid grid-cols-1 gap-4">
            {data.materials?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <Package size={12} /> {l.materials || 'MATERIALS'}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.materials.map((m, i) => (
                    <span key={i} className="text-xs bg-brand-navy text-white px-2.5 py-1 rounded-lg font-medium">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.colors?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <Palette size={12} /> {l.colors || 'COLORS'}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.colors.map((c, i) => (
                    <span key={i} className="text-xs bg-slate-800 text-slate-100 px-2.5 py-1 rounded-lg font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Dimensions */}
        {data.dimensions && (
          <DimensionsSection 
            dimensions={data.dimensions}
            appLang={appLang}
            texts={{
              dimensions: l.metadata || 'Dimensions',
              standard: l.unknown || 'Standard',
              aiEstimated: 'AI'
            }}
          />
        )}
    </div>
  );
};
