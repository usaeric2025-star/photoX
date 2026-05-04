import { useErrorHandler } from '../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { templateService } from '../services/templateService';
import { SYSTEM_TEMPLATES } from '../constants/systemTemplates';
import { useAdminPhoto } from '../context/AdminContexts';

export default function AdminAdsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const [adTemplates, setAdTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  
  useEffect(() => {
    // Optionally fetch templates here
    templateService.getTemplates().then((data) => setAdTemplates(data)).catch((err) => handleError(err));
  }, []);

  if (!user) {
    return <div className="p-8 text-center bg-red-50 text-red-600 font-bold rounded-xl m-8">Permission Denied</div>;
  }

  // Consistent Button Classes
  const inputClass = "flex-1 min-w-0 bg-[#1D3557]/5 border border-[#1D3557]/10 p-3 rounded-2xl text-sm outline-none focus:border-[#D4A853] focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-[#1D3557]/30 text-[#1D3557]";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-[#1D3557]/10 space-y-4 mb-6";

  const seedTemplates = async () => {
    setLoading(true);
    try {
      const results = [];
      for (const t of SYSTEM_TEMPLATES) {
        const exists = adTemplates.find(existing => existing.name === t.style_name);
        if (!exists) {
          const newT = await templateService.saveTemplate(
            t.style_name,
            t.description || "System Template",
            t
          );
          results.push(newT);
        }
      }
      if (results.length > 0) {
        setAdTemplates(prev => [...results, ...prev]);
        alert(`成功初始化 ${results.length} 个模板 / Seeded ${results.length} templates`);
      } else {
        alert('模板库已是最新 / Templates are already up to date');
      }
    } catch (err: any) {
      alert(`初始化失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string, name: string) => {
    // Using default confirm, but the user requested AlertDialog. We'll leave `alert/confirm` out and use custom UI if possible, or build an AlertDialog soon.
    // However, since we are moving this fast, we will integrate AlertDialog.
    setAlertDialog({
      title: '删除模板 / Delete Template',
      message: `确定要永久删除模板 [${name}] 吗？`,
      onConfirm: async () => {
        try {
          await templateService.deleteTemplate(id);
          setAdTemplates(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
          alert('删除失败 / Delete Failed: ' + err.message);
        }
      }
    });
  };

  const [alertDialog, setAlertDialog] = useState<any>(null);

  const setSettingField = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#FDFAF6] flex flex-col pt-safe overflow-auto no-scrollbar">
      {/* Alert Dialog UI */}
      {alertDialog && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
               <h3 className="text-lg font-black mb-2">{alertDialog.title}</h3>
               <p className="text-slate-500 mb-6 font-medium text-sm">{alertDialog.message}</p>
               <div className="flex justify-end gap-3">
                  <button onClick={() => setAlertDialog(null)} className="px-5 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-colors">取消</button>
                  <button onClick={() => { alertDialog.onConfirm(); setAlertDialog(null); }} className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">确定删除</button>
               </div>
            </div>
         </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3 bg-[#FDFAF6] sticky top-0 z-10">
        <button 
          onClick={() => navigate('/admin')} 
          className="p-2 -ml-2 text-[#1D3557]/50 hover:text-[#1D3557] transition-colors rounded-full active:bg-[#1D3557]/5"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-black text-xs text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none uppercase tracking-widest flex-1 ml-1">广告模板管理</h2>
      </div>

      <div className="flex-1 p-4 md:p-6 pb-32 max-w-5xl mx-auto w-full">
         <div className={cardClass}>
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center justify-between gap-2 mb-6">
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                  广告海报系统设定 / AD ENGINE CONFIG
                </span>
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Brand Identity */}
                <div className="lg:col-span-1 space-y-6 pr-0 lg:pr-6 lg:border-r border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">品牌视觉主色</label>
                    <div className="flex flex-wrap gap-2 py-1">
                      {['#1D3557', '#E63946', '#2A9D8F', '#F4A261', '#000000'].map((c) => (
                        <button key={c} onClick={() => setSettingField('ad_brand_color', c)} 
                          className={`w-7 h-7 rounded-lg border-2 transition-all ${(settings?.ad_brand_color || '#1D3557') === c ? 'border-blue-600 ring-4 ring-blue-50' : 'border-white shadow-sm'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">全局 Slogan 预设</label>
                    <input type="text" className={inputClass} value={settings?.ad_default_tagline || ''} onChange={(e) => setSettingField('ad_default_tagline', e.target.value)} placeholder="例如: 极致品质, 触手可及" />
                  </div>
                </div>

                {/* Right: Template & Figma Management */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 mb-3 flex items-center justify-between">
                      海报模板仓库 / TEMPLATE LIBRARY
                      <span className="text-blue-600 font-bold">后台同步已激活</span>
                    </label>
                    
                    <div className="space-y-4">
                      {/* Control Panel */}
                      <div className="flex gap-2">
                        <button 
                          className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> 新置模板
                        </button>
                        <button 
                          onClick={seedTemplates}
                          disabled={loading}
                          className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={14} className="text-amber-500" /> 初始化预设模板 {loading && '...'}
                        </button>
                      </div>

                      {/* Template List */}
                      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-2 max-h-[400px] overflow-y-auto">
                        {adTemplates.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <Sparkles size={20} className="text-slate-300" />
                              </div>
                              <p className="text-xs font-bold text-slate-500 mb-1">暂无模板</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">请点击上方按钮导入</p>
                            </div>
                        ) : (
                          <div className="space-y-2">
                            {adTemplates.map(t => (
                              <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                    <LayoutTemplate size={20} />
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-black text-slate-800">{t.name}</h5>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t.description || '自定义模板'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => deleteTemplate(t.id, t.name)} className="text-[10px] font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest">
                                    删除
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
      </div>
    </div>
  );
}

// Ensure LayoutTemplate is imported since it's used
import { LayoutTemplate } from 'lucide-react';
