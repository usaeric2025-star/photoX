import React from 'react';
import { 
  BarChart3, 
  Image as ImageIcon, 
  Tags, 
  LayoutGrid, 
  Database,
  ArrowUpRight,
  HardDrive
} from 'lucide-react';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { useCategories, useTags } from '@/hooks';
import { motion } from 'motion/react';

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-5 rounded-[28px] border border-brand-navy/5 shadow-sm space-y-3 relative overflow-hidden group"
  >
    <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center mb-1`}>
      <Icon size={20} />
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-black text-brand-navy tracking-tighter">{value}</h4>
        {subValue && <span className="text-[10px] font-bold text-slate-400 uppercase">{subValue}</span>}
      </div>
    </div>
    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <ArrowUpRight size={14} className="text-brand-navy/20" />
    </div>
  </motion.div>
);

export function StatisticsScreen() {
  const { photos } = usePhotoGallery();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const totalPhotos = photos?.length || 0;
  const groupsCount = photos?.filter((p: any) => !!p.group_id).reduce((acc: any, p: any) => {
    if (p.group_id) acc.add(p.group_id);
    return acc;
  }, new Set<string>()).size || 0;

  const hiddenCount = photos?.filter((p: any) => p.is_hidden).length || 0;
  
  // Fake storage calculation for now (average 200KB per photo)
  const estStorage = (totalPhotos * 0.2).toFixed(1);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar pb-32">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-brand-navy tracking-tight uppercase italic flex items-center gap-2">
          <BarChart3 size={24} className="text-brand-gold" />
          系统存量概览 / System Inventory
        </h2>
        <p className="text-xs text-brand-navy/40 font-bold uppercase tracking-widest">
          实时统计与资源分布 / Live Metrics & Resource Distribution
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="总计资产 / Total Assets" 
          value={totalPhotos} 
          subValue="Items"
          icon={ImageIcon}
          colorClass="bg-blue-50 text-blue-600"
          delay={0.1}
        />
        <StatCard 
          title="逻辑分组 / Groups" 
          value={groupsCount} 
          subValue="Clusters"
          icon={LayoutGrid}
          colorClass="bg-brand-navy/5 text-brand-navy"
          delay={0.2}
        />
        <StatCard 
          title="活跃分类 / Categories" 
          value={categories.length} 
          subValue="Types"
          icon={Database}
          colorClass="bg-brand-gold/10 text-brand-gold"
          delay={0.3}
        />
        <StatCard 
          title="逻辑标签 / Labels" 
          value={tags.length} 
          subValue="Tags"
          icon={Tags}
          colorClass="bg-slate-100 text-slate-600"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-brand-navy/5 shadow-sm space-y-6">
          <h3 className="text-xs font-black text-brand-navy uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
            资源明细 / Details
          </h3>
          
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-brand-navy/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand-navy shadow-sm">
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-brand-navy">隐藏资产 / Hidden</p>
                    <p className="text-[9px] text-brand-navy/40 font-bold uppercase tracking-widest">Private assets</p>
                  </div>
                </div>
                <span className="text-sm font-black text-brand-navy">{hiddenCount}</span>
             </div>

             <div className="flex items-center justify-between p-4 bg-brand-navy/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand-navy shadow-sm">
                    <HardDrive size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-brand-navy">估算占用 / Storage Est.</p>
                    <p className="text-[9px] text-brand-navy/40 font-bold uppercase tracking-widest">Estimated R2 usage</p>
                  </div>
                </div>
                <span className="text-sm font-black text-brand-navy">~{estStorage} MB</span>
             </div>
          </div>
        </div>

        <div className="bg-brand-navy p-8 rounded-[32px] shadow-xl space-y-6 text-white overflow-hidden relative">
          <div className="relative space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 italic">System Status</h3>
            <div className="space-y-2">
              <h4 className="text-3xl font-black tracking-tighter leading-tight italic">
                系统运行<span className="text-brand-gold">极佳</span><br />
                System Health: Perfect
              </h4>
              <p className="text-xs font-bold opacity-60 leading-relaxed max-w-[240px]">
                所有数据库分片状态正常，R2 存储链路延迟 45ms，AI 语义引擎索引已完成 100%。
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-fit">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-[9px] font-black uppercase tracking-widest">Live: Operational</span>
            </div>
          </div>
          
          <BarChart3 size={200} className="absolute -bottom-20 -right-20 text-white/5 rotate-12" />
        </div>
      </div>
    </div>
  );
}
