import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Upload, Download, Layout, Type, Palette, Image as ImageIcon, Sparkles, Move, X, Layers, Save, Info, Plus, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAdminSession } from '../context/AdminContexts';

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
  const [activeTab, setActiveTab] = useState<'templates' | 'content' | 'style' | 'layers'>('templates');
  const [adData, setAdData] = useState<AdData>({
    productName: 'Cool Sneakers',
    price: '129.99',
    tagline: settings?.ad_default_tagline || 'Step into the future',
    brandColor: settings?.ad_brand_color || '#1D3557'
  });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Update adData when settings change
  useEffect(() => {
    if (settings?.ad_brand_color) setAdData(prev => ({ ...prev, brandColor: settings.ad_brand_color }));
    if (settings?.ad_default_tagline) setAdData(prev => ({ ...prev, tagline: settings.ad_default_tagline }));
  }, [settings]);

  // Sync Canvas logic (keeping the heavy parts isolated)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1080,
      backgroundColor: '#ffffff'
    });
    
    // Figma Styling
    const objectProto = fabric.FabricObject.prototype;
    objectProto.set({
      transparentCorners: false,
      cornerColor: '#007AFF',
      cornerStyle: 'rect',
      cornerStrokeColor: '#FFFFFF',
      cornerSize: 12,
      borderColor: '#007AFF',
      borderScaleFactor: 2,
    });

    setFabricCanvas(canvas);
    TEMPLATES[0].apply(canvas, adData);
    return () => { canvas.dispose(); };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;
    const bg = fabricCanvas.backgroundImage;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    if (bg) fabricCanvas.backgroundImage = bg;
    const template = TEMPLATES.find(t => t.id === activeTemplate);
    if (template) template.apply(fabricCanvas, adData);
    fabricCanvas.renderAll();
  }, [activeTemplate, fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    const nameObj = objects.find(obj => (obj as any).name === 'productName') as fabric.IText;
    const priceObj = objects.find(obj => (obj as any).name === 'price') as fabric.IText;
    const taglineObj = objects.find(obj => (obj as any).name === 'tagline') as fabric.IText;
    
    if (nameObj) nameObj.set('text', adData.productName);
    if (priceObj) priceObj.set('text', activeTemplate === 'promotion' ? `NOW $${adData.price}` : `$${adData.price}`);
    if (taglineObj) taglineObj.set('text', adData.tagline);
    
    const badgeObj = objects.find(obj => (obj as any).name === 'bg-badge') as fabric.Rect;
    if (badgeObj) badgeObj.set('fill', adData.brandColor);
    if (priceObj && activeTemplate !== 'promotion') priceObj.set('fill', adData.brandColor);

    fabricCanvas.renderAll();
  }, [adData, fabricCanvas, activeTemplate]);

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

  const exportCanvas = (format: 'png' | 'jpeg', multiplier: number = 1) => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({ format, multiplier, quality: 1 });
    const link = document.createElement('a');
    link.download = `AD-${Date.now()}.${format}`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[700px]">
      {/* 侧边菜单导航栏 - Menu style for better organization */}
      <div className="w-full lg:w-20 bg-white rounded-3xl p-3 border border-slate-100 flex lg:flex-col items-center gap-2 shadow-sm shrink-0">
          {[
            { id: 'templates', icon: <Layout size={22} />, label: '模板' },
            { id: 'content', icon: <Type size={22} />, label: '文本' },
            { id: 'style', icon: <Palette size={22} />, label: '外观' },
            { id: 'layers', icon: <Sparkles size={22} />, label: '图层' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
      </div>

      {/* 控制详情面板 */}
      <div className="w-full lg:w-80 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-6 overflow-y-auto max-h-[800px] shrink-0">
        <AnimatePresence mode="wait">
          {activeTab === 'templates' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">选择海报样式</h3>
              <div className="grid grid-cols-1 gap-3">
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => setActiveTemplate(t.id)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all ${activeTemplate === t.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:border-slate-100'}`}
                  >
                    <div className="font-bold text-xs mb-1 text-slate-900 uppercase">{t.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{t.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">文本内容编辑</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">产品名称 (支持中文)</label>
                  <input type="text" value={adData.productName} onChange={(e) => setAdData({...adData, productName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-100 font-medium" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">显示售价</label>
                  <input type="text" value={adData.price} onChange={(e) => setAdData({...adData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-100 font-bold" />
                </div>
                {activeTemplate === 'price-focused' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">额外营销语</label>
                    <input type="text" value={adData.tagline} onChange={(e) => setAdData({...adData, tagline: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-100 italic" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'style' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">视觉样式设定</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-3 uppercase">配色方案</label>
                  <div className="flex flex-wrap gap-2">
                    {['#1D3557', '#E63946', '#2A9D8F', '#F4A261', '#000000'].map((c) => (
                      <button key={c} onClick={() => setAdData({...adData, brandColor: c})}
                        className={`w-10 h-10 rounded-full border-4 shadow-sm ${adData.brandColor === c ? 'border-white ring-4 ring-blue-50' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-3 uppercase">背景图片管理</label>
                  <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all">
                    <Upload size={20} className="text-slate-400 mb-2" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">点击上传产品原图</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'layers' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">导出与集成</h3>
              <div className="space-y-4">
                <button onClick={() => exportCanvas('png')} className="w-full py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-black transition-all">
                  <Download size={18} /> 下载成品 PNG
                </button>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <h4 className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-2 mb-2">
                    <Move size={14} /> FIGMA 兼容方案
                  </h4>
                  <p className="text-[10px] text-blue-600 leading-relaxed font-medium">您可以导出 SVG 格式，此格式保留了所有的矢量层（文字、形状），可直接拖入 Figma 进一步微调。</p>
                  <button onClick={() => {
                    const svg = fabricCanvas?.toSVG();
                    const blob = new Blob([svg], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `AD-LAYERS.svg`;
                    link.href = url;
                    link.click();
                  }} className="mt-3 w-full py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all">
                    导出矢量 SVG
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 画布预览中心区域 */}
      <div className="flex-1 bg-slate-100 rounded-[40px] flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
        <div className="relative shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white transform scale-[0.4] md:scale-[0.5] lg:scale-[0.7] xl:scale-[0.8] origin-center transition-all duration-700">
          <canvas ref={canvasRef} />
        </div>
        
        {!backgroundImage && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            尚未上传背景图，当前为预览模式
          </div>
        )}
      </div>
    </div>
  );
}
