import React from 'react';
import { Plus } from 'lucide-react';
import { Manufacturer } from '../../types';
import { ManufacturerItem } from '../admin/ManufacturerItem';

interface ManufacturersSectionProps {
  manufacturers: Manufacturer[];
  handleAddManufacturer: () => void;
  handleUpdateMfrName: (mfr: Manufacturer) => void;
  deleteManufacturer: (id: string) => void;
  cardClass: string;
  buttonStyles: { [key in 'primary' | 'secondary' | 'accent']: string };
}

export const ManufacturersSection: React.FC<ManufacturersSectionProps> = ({
  manufacturers,
  handleAddManufacturer,
  handleUpdateMfrName,
  deleteManufacturer,
  cardClass,
  buttonStyles
}) => {
  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          生产商
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{(manufacturers || []).length} 个项目</span>
      </div>
      <div className="flex gap-2">
        <button onClick={handleAddManufacturer} className={buttonStyles.accent}>
          <Plus size={16} /> 新增生产商
        </button>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {(manufacturers || []).map(sub => (
          <ManufacturerItem 
            key={sub.id} 
            manufacturer={sub} 
            onUpdate={handleUpdateMfrName}
            onDelete={(id) => deleteManufacturer(String(id))} 
          />
        ))}
      </div>
    </section>
  );
};
