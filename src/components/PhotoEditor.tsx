import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { Upload, Download, Layout, Type, Palette, Image as ImageIcon, Sparkles, Move, X, Layers, Save, Info, Plus, ChevronDown, CheckCircle2, FileText, Package, Trash2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAdminSession, useAdminUI, useAdminPhoto } from '../context/AdminContexts';
import JSZip from 'jszip';
import { UVTSTemplate } from '../types/uvts';

// Types for our templates
interface AdTemplate {
  id: string;
  name: string;
  description: string;
  apply: (canvas: fabric.Canvas, data: AdData, uvtsData?: UVTSTemplate) => void;
  isUVTS?: boolean;
  uvtsData?: UVTSTemplate;
}

interface AdData {
  productName: string;
  price: string;
  tagline: string;
  brandColor: string;
}

const TEMPLATES: AdTemplate[] = [
  {
    id: 'swiss-typographic',
    name: '瑞士几何 / SWISS',
    description: '非对称排版，极具视觉冲击力',
    apply: (canvas, data) => {
      // Decorative bar
      const bar = new fabric.Rect({
        left: 0,
        top: 0,
        width: 60,
        height: canvas.height!,
        fill: data.brandColor || '#1D3557',
        selectable: false
      });

      const name = new fabric.IText((data.productName || 'MODERN DESIGN').toUpperCase(), {
        left: 100,
        top: 120,
        fontSize: 110,
        fontWeight: '900',
        fontFamily: 'Impact, sans-serif',
        fill: '#000000',
        lineHeight: 0.8,
        charSpacing: -40
      });
      (name as any).name = 'productName';
      
      const priceTag = new fabric.IText('VALUE //', {
        left: 105,
        top: 380,
        fontSize: 22,
        fontWeight: '900',
        fill: '#000000',
        charSpacing: 200
      });

      const price = new fabric.IText(`${data.price || '99.00'}`, {
        left: 100,
        top: 400,
        fontSize: 260,
        fontWeight: '900',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fill: data.brandColor || '#1D3557',
        lineHeight: 1,
        charSpacing: -10
      });
      (price as any).name = 'price';

      const tagline = new fabric.IText(data.tagline || 'LIMITED RELEASE / SPEC_2024', {
        left: 105,
        top: canvas.height! - 100,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        fill: '#000000',
        charSpacing: 150
      });
      (tagline as any).name = 'tagline';

      canvas.add(bar, name, priceTag, price, tagline);
    }
  },
  {
    id: 'editorial-cover',
    name: '期刊杂志 / COVER',
    description: '经典画报感，优雅且平衡',
    apply: (canvas, data) => {
      const frame = new fabric.Rect({
        left: 50,
        top: 50,
        width: canvas.width! - 100,
        height: canvas.height! - 100,
        fill: 'transparent',
        stroke: '#FFFFFF',
        strokeWidth: 2,
        selectable: false
      });

      const header = new fabric.IText('PHOTOX COLLECTIVE', {
        left: canvas.width! / 2,
        top: 100,
        fontSize: 28,
        fontWeight: '900',
        fontFamily: 'Georgia, serif',
        fill: '#FFFFFF',
        originX: 'center',
        charSpacing: 500
      });

      const name = new fabric.IText(data.productName || 'The New Standard', {
        left: canvas.width! / 2,
        top: canvas.height! / 2 - 40,
        fontSize: 84,
        fontWeight: 'bold',
        fontFamily: 'Georgia, serif',
        fill: '#FFFFFF',
        originX: 'center',
        textAlign: 'center',
        fontStyle: 'italic'
      });
      (name as any).name = 'productName';

      const priceCircle = new fabric.Circle({
        radius: 80,
        fill: data.brandColor || '#E63946',
        left: canvas.width! / 2,
        top: canvas.height! / 2 + 150,
        originX: 'center',
        originY: 'center'
      });
      
      const priceVal = new fabric.IText(`$${data.price || '29'}`, {
        fontSize: 48,
        fontWeight: 'bold',
        fill: '#FFFFFF',
        originX: 'center',
        originY: 'center',
        left: canvas.width! / 2,
        top: canvas.height! / 2 + 150
      });

      const tagline = new fabric.IText((data.tagline || 'Essential aesthetic for refined living').toUpperCase(), {
        left: canvas.width! / 2,
        top: canvas.height! - 110,
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#FFFFFF',
        originX: 'center',
        charSpacing: 300
      });
      (tagline as any).name = 'tagline';

      canvas.add(frame, header, name, priceCircle, priceVal, tagline);
    }
  },
  {
    id: 'retro-brutalist',
    name: '街头潮流 / BRUTAL',
    description: '硬核工业感，适合个性表达',
    apply: (canvas, data) => {
      const darkBg = new fabric.Rect({
        left: 0,
        top: canvas.height! - 320,
        width: canvas.width!,
        height: 320,
        fill: '#000000',
        selectable: false
      });

      const stripe = new fabric.Rect({
        left: 0,
        top: 200,
        width: canvas.width!,
        height: 140,
        fill: data.brandColor || '#F4A261',
        stroke: '#000000',
        strokeWidth: 4
      });

      const name = new fabric.IText(data.productName || 'MANIFESTO', {
        left: 40,
        top: 215,
        fontSize: 96,
        fontWeight: '900',
        fill: '#000000',
        fontFamily: 'Arial Black'
      });
      (name as any).name = 'productName';

      const priceLabel = new fabric.IText('COST //', {
        left: 45,
        top: canvas.height! - 260,
        fontSize: 40,
        fontWeight: '900',
        fill: data.brandColor || '#F4A261'
      });

      const price = new fabric.IText(`${data.price || '10K'}`, {
        left: 40,
        top: canvas.height! - 220,
        fontSize: 180,
        fontWeight: '900',
        fill: '#FFFFFF',
        fontFamily: 'Impact'
      });
      (price as any).name = 'price';

      const tagline = new fabric.IText(data.tagline || 'NO COMPROMISE // 2024_FW', {
        left: 45,
        top: canvas.height! - 65,
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#FFFFFF',
        charSpacing: 200
      });
      (tagline as any).name = 'tagline';

      canvas.add(darkBg, stripe, name, priceLabel, price, tagline);
    }
  },
  {
    id: 'modern-minimal',
    name: '雅致极简 / ZEN',
    description: '通透感与大量留白，宁静奢华',
    apply: (canvas, data) => {
      const lineTop = new fabric.Rect({
        left: canvas.width! / 2 - 100,
        top: 150,
        width: 200,
        height: 1,
        fill: '#333',
        originX: 'center'
      });

      const name = new fabric.IText(data.productName || 'Serenity', {
        left: canvas.width! / 2,
        top: 200,
        fontSize: 64,
        fontWeight: '200',
        fill: '#222',
        originX: 'center',
        charSpacing: 400
      });
      (name as any).name = 'productName';

      const priceBox = new fabric.Rect({
        width: 140,
        height: 60,
        fill: 'transparent',
        stroke: data.brandColor || '#2A9D8F',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        left: canvas.width! / 2,
        top: canvas.height! - 200
      });

      const price = new fabric.IText(`${data.price || '49'}`, {
        left: canvas.width! / 2,
        top: canvas.height! - 200,
        fontSize: 28,
        fontWeight: '300',
        fill: '#222',
        originX: 'center',
        originY: 'center'
      });
      (price as any).name = 'price';

      const tagline = new fabric.IText(data.tagline || 'The art of simplicity', {
        left: canvas.width! / 2,
        top: canvas.height! - 140,
        fontSize: 16,
        fontWeight: '300',
        fill: '#999',
        originX: 'center'
      });
      (tagline as any).name = 'tagline';

      canvas.add(lineTop, name, priceBox, price, tagline);
    }
  },
  {
    id: 'technical-data',
    name: '工业参数 / TECH',
    description: '硬连接布局，展现极致专业性',
    apply: (canvas, data) => {
      const topBar = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width!,
        height: 40,
        fill: '#000000'
      });

      const title = new fabric.IText('DEVICEX_PRTCL // SYSTEM_OVERRIDE', {
        left: 20,
        top: 12,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
      });

      const name = new fabric.IText(data.productName || 'QUANTUM_CORE', {
        left: 40,
        top: 100,
        fontSize: 84,
        fontWeight: '900',
        fill: data.brandColor || '#1D3557',
        fontFamily: 'Impact'
      });
      (name as any).name = 'productName';

      const priceGroup = new fabric.Rect({
        left: 40,
        top: 220,
        width: 380,
        height: 90,
        fill: '#000000'
      });

      const priceVal = new fabric.IText(`$${data.price || '499.00'}`, {
        left: 65,
        top: 240,
        fontSize: 56,
        fontWeight: 'bold',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
      });
      (priceVal as any).name = 'price';

      const tagline = new fabric.IText(`[ DATA_LOG: ${data.tagline || 'HIGH PERFORMANCE UNIT'} ]\n[ STATUS: ACTIVE ]\n[ COORDS: 35.6895_N 139.6917_E ]`, {
        left: 40,
        top: canvas.height! - 160,
        fontSize: 18,
        lineHeight: 1.4,
        fill: '#333333',
        fontFamily: 'monospace',
        fontWeight: 'bold'
      });
      (tagline as any).name = 'tagline';

      canvas.add(topBar, title, name, priceGroup, priceVal, tagline);
    }
  }
];

export default function PhotoEditor() {
  const { settings } = useAdminSession();
  const { adTemplates } = useAdminPhoto();
  const { showToast } = useAdminUI();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string>(TEMPLATES[0].id);
  const [activeTab, setActiveTab] = useState<'templates' | 'batch' | 'content' | 'style' | 'layers'>('templates');
  
  // Convert DB templates to AdTemplate format
  const dbTemplates: AdTemplate[] = (adTemplates || []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isUVTS: true,
    uvtsData: t.uvts_json,
    apply: () => {}
  }));

  const allTemplates = [...TEMPLATES, ...dbTemplates];
  
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
    
    const template = allTemplates.find(t => t.id === activeTemplate);
    if (template) {
      if (template.isUVTS && template.uvtsData) {
        applyUVTSTemplate(fabricCanvas, currentItem, template.uvtsData);
      } else {
        template.apply(fabricCanvas, currentItem);
      }
    }
    fabricCanvas.renderAll();
  }, [fabricCanvas, activeTemplate, currentItem, allTemplates]);

  const applyUVTSTemplate = (canvas: fabric.Canvas, data: AdData, uvts: UVTSTemplate) => {
    const canvasWidth = canvas.width || 1000;
    const canvasHeight = canvas.height || 1000;
    
    // Background color
    canvas.backgroundColor = uvts.canvas.background;

    // Info Layer Calculation
    const infoWidth = (uvts.structure.info_layer.width_pct / 100) * canvasWidth;
    const padding = (uvts.structure.info_layer.padding_pct / 100) * canvasWidth;
    const align = uvts.structure.info_layer.align;
    const startX = align === 'left' ? padding : canvasWidth - infoWidth + padding;

    // 1. Render Product Name
    const nameSpec = uvts.typography['#Product_Name'];
    if (nameSpec) {
      const nameText = new fabric.IText(data.productName, {
        left: startX,
        top: canvasHeight * 0.2,
        fontSize: canvasWidth * 0.06 * nameSpec.size_em,
        fontFamily: nameSpec.font,
        fontWeight: nameSpec.weight as any,
        fill: nameSpec.color || '#000000',
        name: 'productName'
      });
      canvas.add(nameText);
    }

    // 2. Render Price
    const priceSpec = uvts.typography['#Price_Now'];
    if (priceSpec) {
      const symbol = priceSpec.symbol_logic?.content || '';
      const fullPrice = `${symbol}${data.price}`;
      const priceText = new fabric.IText(fullPrice, {
        left: startX,
        top: canvasHeight * 0.4,
        fontSize: canvasWidth * 0.1 * priceSpec.size_em,
        fontFamily: priceSpec.font,
        fontWeight: priceSpec.weight as any,
        fill: priceSpec.color || '#000000',
        name: 'price'
      });
      canvas.add(priceText);
    }

    // 3. Render Tagline/Spec
    const specSpec = uvts.typography['#Product_Spec'];
    if (specSpec) {
      const specText = new fabric.IText(data.tagline, {
        left: startX,
        top: canvasHeight * 0.35,
        fontSize: canvasWidth * 0.04 * specSpec.size_em,
        fontFamily: specSpec.font,
        fontWeight: specSpec.weight as any,
        fill: specSpec.color || '#333333',
        name: 'tagline'
      });
      canvas.add(specText);
    }
  };

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

  // Calculate dynamic scale for canvas visibility
  const [containerScale, setContainerScale] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const maxSize = Math.min(width, height) - 40;
      const scale = maxSize / 1080;
      setContainerScale(scale);
    };

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    updateScale();
    return () => resizeObserver.disconnect();
  }, []);

  const handleDownload = async () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2, quality: 1 });
    const link = document.createElement('a');
    link.download = `PhotoX-Poster-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast('高清海报已导出', 'success');
  };

  const [editingText, setEditingText] = useState<{ id: string; text: string; top: number; left: number; width: number } | null>(null);

  // Handle fabric events for smooth editing
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = (e: any) => {
      const selected = e.selected?.[0];
      if (selected && (selected.type === 'i-text' || selected.type === 'text')) {
        const boundingRect = selected.getBoundingRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        
        if (canvasRect) {
          setEditingText({
            id: selected.id || selected.name || 'text',
            text: selected.text || '',
            top: canvasRect.top + boundingRect.top,
            left: canvasRect.left + boundingRect.left,
            width: boundingRect.width
          });
        }
      } else {
        setEditingText(null);
      }
    };

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', () => setEditingText(null));
    fabricCanvas.on('object:moving', () => setEditingText(null));
    fabricCanvas.on('mouse:down', (e) => {
      if (!e.target) setEditingText(null);
    });

    return () => {
      fabricCanvas.off('selection:created');
      fabricCanvas.off('selection:updated');
      fabricCanvas.off('selection:cleared');
      fabricCanvas.off('object:moving');
      fabricCanvas.off('mouse:down');
    };
  }, [fabricCanvas]);

  const handleTextChange = (newText: string) => {
    if (!fabricCanvas || !editingText) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
      (activeObject as any).set('text', newText);
      fabricCanvas.renderAll();
      setEditingText({ ...editingText, text: newText });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col overflow-hidden z-50">
      {/* Top Header */}
      <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => window.location.reload()} 
             className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-100 text-slate-400 transition-all"
           >
              <X size={20} />
           </button>
           <div className="flex flex-col">
              <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none mb-1">照片海报编辑器</h1>
              <div className="flex items-center gap-1.5">
                 <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                 <span className="text-[8px] font-bold text-slate-400 uppercase">Live Preview Active</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-2">
           <label className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-black transition-all shadow-lg shadow-black/10">
              <ImageIcon size={14} /> 更换底图
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
           </label>
        </div>
      </div>

      {/* Middle: Main Preview Area */}
      <div ref={containerRef} className="flex-1 relative bg-slate-100/50 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40"></div>
        
        <div className="relative shadow-[0_30px_100px_rgba(0,0,0,0.15)] bg-white rounded-xl overflow-hidden" 
             style={{ 
               width: 1080 * containerScale, 
               height: 1080 * containerScale 
             }}>
          <div style={{ transform: `scale(${containerScale})`, transformOrigin: '0 0' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Text Editing Overlay */}
        <AnimatePresence>
          {editingText && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ 
                position: 'fixed',
                top: editingText.top - 10,
                left: editingText.left - 10,
                zIndex: 60,
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl border border-blue-100 p-2 min-w-[200px]">
                <textarea
                  autoFocus
                  className="w-full bg-slate-50 border-none outline-none p-3 text-sm font-bold text-slate-900 rounded-lg resize-none min-h-[60px]"
                  value={editingText.text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="输入文字内容..."
                />
                <div className="flex justify-end gap-2 mt-2 px-1">
                  <button 
                    onClick={() => setEditingText(null)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-200"
                  >
                    确定完成
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Controls for multi-photo context */}
        {batchItems.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 shadow-2xl flex items-center gap-6 z-30">
            <button 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Move size={18} className="rotate-180" />
            </button>
            <span className="text-[10px] font-black text-slate-900 tracking-widest">{currentIndex + 1} / {batchItems.length}</span>
            <button 
              onClick={() => setCurrentIndex(Math.min(batchItems.length - 1, currentIndex + 1))}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Move size={18} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {isExporting && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-white/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center"
             >
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">渲染极致画质中 / RENDERING HIGH QUALITY</p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Template Selector & Actions */}
      <div className="bg-white border-t border-slate-100 p-4 pb-8 lg:pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-40">
         <div className="max-w-4xl mx-auto space-y-4">
            {/* Horizontal Scrollable Templates */}
            <div className="flex overflow-x-auto gap-3 pb-3 px-1 custom-scrollbar scroll-smooth snap-x no-scrollbar">
               {allTemplates.map((t) => (
                 <button 
                   key={t.id} 
                   onClick={() => {
                     setActiveTemplate(t.id);
                     if (fabricCanvas) {
                       if (t.isUVTS && t.uvtsData) {
                         applyUVTSTemplate(fabricCanvas, currentItem, t.uvtsData);
                       } else {
                         // Default system templates logic
                         t.apply(fabricCanvas, currentItem);
                       }
                     }
                   }}
                   className={`flex-none w-28 snap-start p-3 rounded-2xl border-2 transition-all group ${
                     activeTemplate === t.id 
                       ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                       : 'border-transparent bg-slate-50 opacity-60 hover:opacity-100 hover:bg-slate-100'
                   }`}
                 >
                    <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center transition-all ${
                      activeTemplate === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white text-slate-400'
                    }`}>
                       <Layout size={18} />
                    </div>
                    <div className={`text-[9px] font-black uppercase text-center truncate ${
                      activeTemplate === t.id ? 'text-blue-600' : 'text-slate-500'
                    }`}>
                      {t.name}
                    </div>
                 </button>
               ))}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex gap-3 pt-2">
               <button 
                 onClick={handleDownload}
                 className="flex-1 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95"
               >
                 <Download size={18} /> 导出海报图片 / EXPORT
               </button>
               <button 
                 onClick={() => showToast('已生成分享链接', 'success')}
                 className="w-14 h-14 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
               >
                 <Zap size={20} />
               </button>
            </div>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
