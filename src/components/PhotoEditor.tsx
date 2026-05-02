import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Upload, Download, Layout, Type, Palette, Image as ImageIcon, Sparkles, Move } from 'lucide-react';
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
  const [adData, setAdData] = useState<AdData>({
    productName: 'Cool Sneakers',
    price: '129.99',
    tagline: settings?.ad_default_tagline || 'Step into the future',
    brandColor: settings?.ad_brand_color || '#1D3557'
  });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Update adData when settings change (only for defaults)
  useEffect(() => {
    if (settings?.ad_brand_color) {
      setAdData(prev => ({ ...prev, brandColor: settings.ad_brand_color }));
    }
    if (settings?.ad_default_tagline) {
      setAdData(prev => ({ ...prev, tagline: settings.ad_default_tagline }));
    }
  }, [settings]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1080,
      backgroundColor: '#f0f0f0'
    });

    // Figma-like selection borders
    const objectProto = fabric.FabricObject.prototype;
    objectProto.transparentCorners = false;
    objectProto.cornerColor = '#007AFF';
    objectProto.cornerStyle = 'rect';
    objectProto.cornerStrokeColor = '#FFFFFF';
    objectProto.cornerSize = 12;
    objectProto.borderColor = '#007AFF';
    objectProto.borderScaleFactor = 2;

    setFabricCanvas(canvas);

    // Initial Template
    TEMPLATES[0].apply(canvas, adData);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Handle Template and Data changes
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // In v7, we should clear only non-background objects or just re-apply
    // For simplicity, we clear and re-add, but preserve background
    const bg = fabricCanvas.backgroundImage;
    
    // Clear everything
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#f0f0f0';
    
    if (bg) {
      fabricCanvas.backgroundImage = bg;
    }

    const template = TEMPLATES.find(t => t.id === activeTemplate);
    if (template) {
      template.apply(fabricCanvas, adData);
    }
    
    fabricCanvas.renderAll();
  }, [activeTemplate, fabricCanvas]);

  // Sync Data Fields
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    const nameObj = objects.find(obj => (obj as any).name === 'productName') as fabric.IText;
    const priceObj = objects.find(obj => (obj as any).name === 'price') as fabric.IText;
    const taglineObj = objects.find(obj => (obj as any).name === 'tagline') as fabric.IText;
    const priceInternalObj = objects.find(obj => (obj as any).name === 'price-internal') as fabric.IText;
    
    if (nameObj) nameObj.set('text', adData.productName);
    if (priceObj) priceObj.set('text', activeTemplate === 'promotion' ? `NOW $${adData.price}` : `$${adData.price}`);
    if (priceInternalObj) priceInternalObj.set('text', `$${adData.price}`);
    if (taglineObj) taglineObj.set('text', adData.tagline);
    
    // Brand Color updates
    const badgeObj = objects.find(obj => (obj as any).name === 'bg-badge') as fabric.Rect;
    if (badgeObj) badgeObj.set('fill', adData.brandColor);
    
    if (priceObj && activeTemplate !== 'promotion') {
       priceObj.set('fill', adData.brandColor);
    }

    fabricCanvas.renderAll();
  }, [adData, fabricCanvas, activeTemplate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const data = f.target?.result as string;
      setBackgroundImage(data);
      
      try {
        const img = await fabric.FabricImage.fromURL(data);
        const scale = Math.max(fabricCanvas.width! / img.width!, fabricCanvas.height! / img.height!);
        
        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: fabricCanvas.width! / 2,
          top: fabricCanvas.height! / 2,
          selectable: false,
          evented: false,
        });

        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      } catch (err) {
        console.error("Image load error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const exportCanvas = (format: 'png' | 'jpeg', multiplier: number = 1) => {
    if (!fabricCanvas) return;
    
    const dataUrl = fabricCanvas.toDataURL({
      format: format,
      multiplier: multiplier,
      quality: 1
    });
    
    const link = document.createElement('a');
    link.download = `product-ad-${Date.now()}.${format}`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Editor Main Area */}
      <div className="flex-1 w-full bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
        <div className="p-5 border-b border-gray-50 flex flex-wrap justify-between items-center bg-gray-50/30 gap-4">
          <div className="flex gap-2">
            <button 
              onClick={() => exportCanvas('png')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <Download size={18} /> Export PNG
            </button>
            <button 
              onClick={() => {
                if (!fabricCanvas) return;
                const svg = fabricCanvas.toSVG();
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `ad-layers-${Date.now()}.svg`;
                link.href = url;
                link.click();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              title="Export as SVG for Figma/Illustrator"
            >
              <Move size={18} /> Figma (SVG)
            </button>
            <button 
              onClick={() => exportCanvas('jpeg', 2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
            >
              High Res (2x)
            </button>
          </div>
          <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 cursor-pointer transition-all shadow-lg active:scale-95">
            <Upload size={18} /> 
            Upload Photo
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>
        
        <div className="relative aspect-square flex items-center justify-center bg-[#F0F0F2] p-8 overflow-hidden">
           <div className="relative shadow-2xl scale-[0.4] md:scale-[0.5] lg:scale-[0.6] xl:scale-[0.7] transition-transform duration-500">
             <canvas ref={canvasRef} className="rounded-sm" />
           </div>
           
           {!backgroundImage && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none p-12 text-center">
               <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                 <ImageIcon size={40} className="text-gray-400" />
               </div>
               <h3 className="text-xl font-bold text-gray-600 mb-2">Ready to Design?</h3>
               <p className="max-w-xs text-sm opacity-60">Upload your product photo to create a professional advertisement in seconds.</p>
             </div>
           )}
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6">
        <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 flex gap-1">
           {['templates', 'content', 'style'].map((tab) => (
             <button key={tab} className="flex-1 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
               {tab}
             </button>
           ))}
        </div>

        {/* Templates */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <Layout size={20} className="text-blue-600" />
            <h2 className="font-black text-lg tracking-tight">AD TEMPLATES</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTemplate(t.id)}
                className={`group p-4 rounded-2xl text-left border-2 transition-all relative overflow-hidden ${
                  activeTemplate === t.id 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-gray-50 hover:border-gray-100 bg-gray-50/30'
                }`}
              >
                <div className={`font-black text-xs mb-1 uppercase tracking-wider ${activeTemplate === t.id ? 'text-blue-700' : 'text-slate-900'}`}>
                  {t.name}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight font-medium">{t.description}</div>
                {activeTemplate === t.id && (
                  <div className="absolute top-1 right-1">
                    <Sparkles size={12} className="text-blue-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Content Details */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <Type size={20} className="text-blue-600" />
            <h2 className="font-black text-lg tracking-tight">AD CONTENT</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Product Name (支持中文)</label>
              <input
                type="text"
                value={adData.productName}
                onChange={(e) => setAdData({...adData, productName: e.target.value})}
                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-medium text-slate-700"
                placeholder="Sneakers X2..."
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sale Price</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="text"
                  value={adData.price}
                  onChange={(e) => setAdData({...adData, price: e.target.value})}
                  className="w-full pl-9 pr-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-bold text-slate-900"
                  placeholder="99.00"
                />
              </div>
            </div>
            {activeTemplate === 'price-focused' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tagline</label>
                <input
                  type="text"
                  value={adData.tagline}
                  onChange={(e) => setAdData({...adData, tagline: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-medium text-slate-600 italic"
                  placeholder="The next evolution..."
                />
              </div>
            )}
          </div>
        </section>

        {/* Brand/Accent Color */}
        <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <Palette size={20} className="text-blue-600" />
            <h2 className="font-black text-lg tracking-tight">AD STYLE</h2>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Brand Accent Color</label>
            <div className="flex flex-wrap gap-3">
              {['#1D3557', '#E63946', '#457B9D', '#2A9D8F', '#F4A261', '#E76F51', '#000000', '#FFD700'].map((c) => (
                <button
                  key={c}
                  onClick={() => setAdData({...adData, brandColor: c})}
                  className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 shadow-sm ${
                    adData.brandColor === c ? 'border-white ring-4 ring-blue-100 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input 
                type="color" 
                value={adData.brandColor}
                onChange={(e) => setAdData({...adData, brandColor: e.target.value})}
                className="w-10 h-10 rounded-full overflow-hidden border-none cursor-pointer appearance-none bg-transparent"
              />
            </div>
          </div>
        </section>

        <div className="px-6 py-4 bg-slate-900 rounded-2xl">
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Canvas Tip</p>
           <p className="text-xs text-white leading-relaxed">
             Drag text to move it. Use corner handles to scale. Background auto-updates with your photo.
           </p>
        </div>
      </div>
    </div>
  );
}
