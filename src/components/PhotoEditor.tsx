import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { Upload, Download, Layout, Type, Palette, Image as ImageIcon, Sparkles, Move, X, Layers, Save, Info, Plus, ChevronDown, CheckCircle2, FileText, Package, Trash2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAdminSession } from '../context/AdminContexts';
import JSZip from 'jszip';

// Types for our templates
interface AdTemplate {
  id: string;
  name: string;
  description: string;
  apply: (canvas: fabric.Canvas, data: AdData) => void;
}

interface AdData {
  productName: string;
  price: string;
  tagline: string;
  brandColor: string;
}

const TEMPLATES: AdTemplate[] = [
  {
    id: 'price-focused',
    name: 'Price Focused',
    description: 'Large price center, product name top',
    apply: (canvas, data) => {
      const name = new fabric.IText(data.productName || 'PRODUCT NAME', {
        left: canvas.width! / 2,
        top: 80,
        fontSize: 48,
        fontWeight: 'bold',
        fontFamily: 'Noto Sans SC',
        fill: '#000000',
        originX: 'center',
        textAlign: 'center',
      });
      (name as any).name = 'productName';
      
      const price = new fabric.IText(`$${data.price || '99'}`, {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        fontSize: 160,
        fontWeight: '900',
        fontFamily: 'Noto Sans SC',
        fill: data.brandColor,
        originX: 'center',
        originY: 'center',
        textAlign: 'center',
      });
      (price as any).name = 'price';

      const tagline = new fabric.IText(data.tagline || 'Limited Offer', {
        left: canvas.width! / 2,
        top: canvas.height! - 100,
        fontSize: 32,
        fontFamily: 'Noto Sans SC',
        fill: '#666666',
        originX: 'center',
        textAlign: 'center',
      });
      (tagline as any).name = 'tagline';

      canvas.add(name, price, tagline);
    }
  },
  {
    id: 'name-focused',
    name: 'Name Focused',
    description: 'Big product name, price bottom right',
    apply: (canvas, data) => {
      const name = new fabric.IText(data.productName || 'PRODUCT NAME', {
        left: 60,
        top: 60,
        fontSize: 80,
        fontWeight: '900',
        fontFamily: 'Noto Sans SC',
        fill: '#000000',
        width: canvas.width! - 120,
      });
      (name as any).name = 'productName';

      const price = new fabric.IText(`$${data.price || '99'}`, {
        left: canvas.width! - 60,
        top: canvas.height! - 60,
        fontSize: 64,
        fontWeight: 'bold',
        fontFamily: 'Noto Sans SC',
        fill: data.brandColor,
        originX: 'right',
        originY: 'bottom',
      });
      (price as any).name = 'price';

      canvas.add(name, price);
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Small logo area, price badge corner',
    apply: (canvas, data) => {
      const rect = new fabric.Rect({
        width: 250,
        height: 100,
        fill: data.brandColor,
        rx: 50,
        ry: 50,
      });
      (rect as any).name = 'bg-badge';

      const priceText = new fabric.IText(`$${data.price || '99'}`, {
        fontSize: 48,
        fill: '#FFFFFF',
        fontFamily: 'Noto Sans SC',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
      });
      (priceText as any).name = 'price-internal';

      const badge = new fabric.Group([rect, priceText], {
        left: canvas.width! - 280,
        top: 40,
      });
      (badge as any).name = 'badge-group';

      const name = new fabric.IText(data.productName || 'Product Name', {
        left: 40,
        top: canvas.height! - 80,
        fontSize: 36,
        fontFamily: 'Noto Sans SC',
        fill: '#333333',
      });
      (name as any).name = 'productName';

      canvas.add(badge, name);
    }
  },
  {
    id: 'promotion',
    name: 'Promotion',
    description: 'SALE banner + price + name',
    apply: (canvas, data) => {
      const banner = new fabric.Rect({
        width: canvas.width!,
        height: 120,
        fill: '#FF0000',
        top: 0,
        left: 0,
        selectable: false,
      });
      (banner as any).name = 'banner';

      const saleText = new fabric.IText('SALE', {
        left: canvas.width! / 2,
        top: 60,
        fontSize: 80,
        fontWeight: '900',
        fill: '#FFFFFF',
        fontFamily: 'Noto Sans SC',
        originX: 'center',
        originY: 'center',
        selectable: false
      });

      const name = new fabric.IText(data.productName || 'PRODUCT NAME', {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        fontSize: 64,
        fontWeight: 'bold',
        fontFamily: 'Noto Sans SC',
        originX: 'center',
      });
      (name as any).name = 'productName';

      const price = new fabric.IText(`NOW $${data.price || '99'}`, {
        left: canvas.width! / 2,
        top: canvas.height! / 2 + 100,
        fontSize: 48,
        fontFamily: 'Noto Sans SC',
        fill: '#FF0000',
        originX: 'center',
      });
      (price as any).name = 'price';

      canvas.add(banner, saleText, name, price);
    }
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    description: 'White overlay card with name + price',
    apply: (canvas, data) => {
      const card = new fabric.Rect({
        width: 500,
        height: 300,
        fill: 'rgba(255, 255, 255, 0.9)',
        left: canvas.width! / 2 - 250,
        top: canvas.height! - 400,
        rx: 20,
        ry: 20,
        shadow: new fabric.Shadow({ blur: 20, color: 'rgba(0,0,0,0.1)', offsetX: 0, offsetY: 10 }),
      });
      (card as any).name = 'card';

      const name = new fabric.IText(data.productName || 'Product Name', {
        left: canvas.width! / 2,
        top: canvas.height! - 330,
        fontSize: 40,
        fontWeight: 'bold',
        fontFamily: 'Noto Sans SC',
        fill: '#000000',
        originX: 'center',
      });
      (name as any).name = 'productName';

      const price = new fabric.IText(`$${data.price || '99'}`, {
        left: canvas.width! / 2,
        top: canvas.height! - 250,
        fontSize: 60,
        fontWeight: '900',
        fontFamily: 'Noto Sans SC',
        fill: data.brandColor,
        originX: 'center',
      });
      (price as any).name = 'price';

      canvas.add(card, name, price);
    }
  }
];

export default function PhotoEditor() {
  const { settings } = useAdminSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string>(TEMPLATES[0].id);
  const [activeTab, setActiveTab] = useState<'templates' | 'batch' | 'content' | 'style' | 'layers'>('templates');
  
  // Batch Data State
  const [batchItems, setBatchItems] = useState<AdData[]>([{
    productName: '示例产品名称',
    price: '99',
    tagline: settings?.ad_default_tagline || '限量供应',
    brandColor: settings?.ad_brand_color || '#1D3557'
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rawImportData, setRawImportData] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentItem = batchItems[currentIndex] || batchItems[0];

  useEffect(() => {
    if (settings?.ad_brand_color || settings?.ad_default_tagline) {
      setBatchItems(prev => prev.map(item => ({
        ...item,
        brandColor: settings.ad_brand_color || item.brandColor,
        tagline: settings.ad_default_tagline || item.tagline
      })));
    }
  }, [settings]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1080,
      backgroundColor: '#ffffff'
    });
    
    setFabricCanvas(canvas);
    return () => { canvas.dispose(); };
  }, []);

  const refreshCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    const bg = fabricCanvas.backgroundImage;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    if (bg) fabricCanvas.backgroundImage = bg;
    const template = TEMPLATES.find(t => t.id === activeTemplate);
    if (template) template.apply(fabricCanvas, currentItem);
    fabricCanvas.renderAll();
  }, [fabricCanvas, activeTemplate, currentItem]);

  useEffect(() => {
    refreshCanvas();
  }, [refreshCanvas]);

  const handleRawImport = () => {
    const lines = rawImportData.split('\n').filter(l => l.trim().length > 0);
    const newItems: AdData[] = lines.map(line => {
      const parts = line.split(/[,，\t]/);
      return {
        productName: parts[0]?.trim() || '未命名产品',
        price: parts[1]?.trim() || '0',
        tagline: parts[2]?.trim() || settings?.ad_default_tagline || '',
        brandColor: settings?.ad_brand_color || '#1D3557'
      };
    });

    if (newItems.length > 0) {
      setBatchItems(newItems);
      setCurrentIndex(0);
      setActiveTab('batch');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;
    const reader = new FileReader();
    reader.onload = async (f) => {
      const data = f.target?.result as string;
      setBackgroundImage(data);
      const img = await fabric.FabricImage.fromURL(data);
      const scale = Math.max(fabricCanvas.width! / img.width!, fabricCanvas.height! / img.height!);
      img.set({ scaleX: scale, scaleY: scale, originX: 'center', originY: 'center', left: fabricCanvas.width! / 2, top: fabricCanvas.height! / 2, selectable: false, evented: false });
      fabricCanvas.backgroundImage = img;
      fabricCanvas.renderAll();
    };
    reader.readAsDataURL(file);
  };

  const exportAll = async (format: 'webp' | 'png') => {
    if (!fabricCanvas) return;
    setIsExporting(true);
    const zip = new JSZip();
    const template = TEMPLATES.find(t => t.id === activeTemplate);

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const bg = fabricCanvas.backgroundImage;
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        if (bg) fabricCanvas.backgroundImage = bg;
        
        if (template) template.apply(fabricCanvas, batchItems[i]);
        fabricCanvas.renderAll();

        const dataUrl = fabricCanvas.toDataURL({ format, multiplier: 1, quality: 0.95 });
        const base64Data = dataUrl.split(',')[1];
        zip.file(`Ad-${i + 1}-${batchItems[i].productName}.${format}`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `Batch-Ads-${Date.now()}.zip`;
      link.href = URL.createObjectURL(content);
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      refreshCanvas();
      setIsExporting(false);
    }
  };

  const updateCurrentItem = (updates: Partial<AdData>) => {
    const newItems = [...batchItems];
    newItems[currentIndex] = { ...newItems[currentIndex], ...updates };
    setBatchItems(newItems);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[700px]">
      {/* Side Menu */}
      <div className="w-full lg:w-20 bg-white rounded-3xl p-3 border border-slate-100 flex lg:flex-col items-center gap-2 shadow-sm shrink-0">
          {[
            { id: 'templates', icon: <Layout size={22} />, label: '模板' },
            { id: 'batch', icon: <Package size={22} />, label: '批处理' },
            { id: 'content', icon: <Type size={22} />, label: '编辑' },
            { id: 'layers', icon: <Download size={22} />, label: '导出' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
      </div>

      {/* Control Detail Panel */}
      <div className="w-full lg:w-80 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-6 overflow-y-auto max-h-[800px] shrink-0">
        <AnimatePresence mode="wait">
          {activeTab === 'templates' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key="templates">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">选择海报布局</h3>
              <div className="space-y-3">
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => setActiveTemplate(t.id)}
                    className={`w-full p-4 rounded-2xl text-left border-2 transition-all ${activeTemplate === t.id ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-slate-100'}`}
                  >
                    <div className="font-bold text-xs mb-1 text-slate-900 uppercase">{t.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{t.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'batch' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key="batch" className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">批量导入 (CSV/TXT)</h3>
                <textarea 
                  className="w-full h-32 p-3 text-[11px] bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  placeholder="每行一个产品：产品名, 价格, 标语"
                  value={rawImportData}
                  onChange={(e) => setRawImportData(e.target.value)}
                />
                <button onClick={handleRawImport} className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> 确认导入 / IMPORT
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block">任务列表 ({batchItems.length})</label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {batchItems.map((item, idx) => (
                    <button key={idx} onClick={() => setCurrentIndex(idx)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${currentIndex === idx ? 'border-blue-600 bg-blue-50' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                    >
                       <div className="text-[10px] font-bold text-slate-700 truncate">{item.productName}</div>
                       <div className="text-[9px] text-slate-400">¥ {item.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key="content" className="space-y-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">属性微调</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">产品名称</label>
                  <input type="text" value={currentItem.productName} onChange={(e) => updateCurrentItem({ productName: e.target.value })} className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">价格</label>
                  <input type="text" value={currentItem.price} onChange={(e) => updateCurrentItem({ price: e.target.value })} className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">品牌颜色</label>
                  <div className="flex gap-2">
                    {['#1D3557', '#E63946', '#2A9D8F', '#F4A261', '#000000'].map(c => (
                        <button key={c} onClick={() => updateCurrentItem({ brandColor: c })} className={`w-6 h-6 rounded-full border-2 ${currentItem.brandColor === c ? 'border-blue-600' : 'border-white'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'layers' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key="layers" className="space-y-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">导出成品</h3>
              <div className="space-y-3">
                <button 
                  disabled={isExporting}
                  onClick={() => exportAll('webp')} 
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isExporting ? <Zap size={18} className="animate-spin" /> : <Download size={18} />} 批量 WebP (最佳性能)
                </button>
                <button 
                  disabled={isExporting}
                  onClick={() => exportAll('png')}
                  className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-50 transition-all"
                >
                  批量 PNG (通用格式)
                </button>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-4">
                 <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    导出的文件将自动打包为 ZIP。WebP 格式推荐用于移动端分享，且对图片清晰度几乎无损。
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-slate-100 rounded-[40px] flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
        
        {/* Navigation Toolbar */}
        <div className="mb-6 flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-2 rounded-full border border-slate-200 shadow-xl z-20 transition-all">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase cursor-pointer hover:text-blue-600 transition-colors">
                <ImageIcon size={14} /> 更换背景图
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            <div className="w-px h-3 bg-slate-200"></div>
            <div className="flex items-center gap-3">
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="rotate-45" size={12} /></button>
                <span className="text-[10px] font-black text-slate-900 min-w-[40px] text-center">{currentIndex + 1} / {batchItems.length}</span>
                <button onClick={() => setCurrentIndex(Math.min(batchItems.length - 1, currentIndex + 1))} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="-rotate-135" size={12} /></button>
            </div>
        </div>

        <div className="relative shadow-[0_20px_60px_rgba(0,0,0,0.15)] bg-white transform scale-[0.4] md:scale-[0.5] lg:scale-[0.6] xl:scale-[0.75] origin-center transition-all duration-700 rounded-xl overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
        
        {isExporting && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-in fade-in duration-300">
             <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl shadow-blue-100"></div>
             <p className="text-xs font-black text-slate-900 uppercase tracking-widest">正在生成批量海报 ...</p>
             <p className="text-[10px] text-slate-500 mt-2 font-medium">RENDERING BATCH PROCESSING</p>
          </div>
        )}
      </div>
    </div>
  );
}
