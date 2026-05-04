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

import { SYSTEM_TEMPLATES } from '../constants/systemTemplates';

const TEMPLATES: AdTemplate[] = SYSTEM_TEMPLATES.map(t => ({
  id: `sys-${t.style_name}`,
  name: t.style_name,
  description: t.description || 'System Template',
  isUVTS: true,
  uvtsData: t,
  apply: () => {}
}));

export default function PhotoEditor() {
  const { settings } = useAdminSession();
  const { adTemplates } = useAdminPhoto();
  const { showToast } = useAdminUI();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string>(TEMPLATES[0].id);
  const [activeTab, setActiveTab] = useState<'templates' | 'batch' | 'content' | 'style' | 'layers'>('templates');
  
  // Convert DB templates to AdTemplate format
  const dbTemplates: AdTemplate[] = (adTemplates || []).map(t => {
    let parsedUVTS = t.uvts_json;
    if (typeof parsedUVTS === 'string') {
      try {
        parsedUVTS = JSON.parse(parsedUVTS);
      } catch (e) {
        console.error('Failed to parse UVTS JSON', e);
      }
    }
    return {
      id: t.id,
      name: t.name || 'Unnamed Template',
      description: t.description || '',
      isUVTS: true,
      uvtsData: parsedUVTS,
      apply: () => {}
    };
  });

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
    if (!uvts || !uvts.canvas) {
      console.warn('Invalid UVTS template structure:', uvts);
      canvas.backgroundColor = '#ffffff';
      return;
    }
    
    const canvasWidth = canvas.width || 1000;
    const canvasHeight = canvas.height || 1000;
    
    // Background color
    canvas.backgroundColor = uvts.canvas.background || '#ffffff';

    // Helper to resolve values (percentages or reserved keys)
    const resolve = (val: any, dim: number, isX = false) => {
      if (typeof val === 'string' && val.endsWith('%')) {
        return (parseFloat(val) / 100) * dim;
      }
      if (val === 'center') return dim / 2;
      return val;
    };

    const resolveColor = (color?: string) => {
      if (color === 'brandColor') return data.brandColor;
      return color;
    };

    const resolveContent = (content?: string) => {
      if (!content) return '';
      if (content === 'productName') return data.productName;
      if (content === 'price') return data.price;
      if (content === 'tagline') return data.tagline;
      return content;
    };

    // 1. Process New Layer System (V2)
    if (uvts.layers && uvts.layers.length > 0) {
      uvts.layers.forEach(l => {
        let obj: fabric.Object | null = null;
        
        const commonProps = {
          left: resolve(l.left, canvasWidth, true),
          top: resolve(l.top, canvasHeight, false),
          fill: resolveColor(l.fill),
          opacity: l.opacity ?? 1,
          originX: l.originX || 'left',
          originY: l.originY || 'top',
          selectable: l.selectable ?? true,
          stroke: resolveColor(l.stroke),
          strokeWidth: l.strokeWidth
        };

        if (l.type === 'text') {
          obj = new fabric.IText(resolveContent(l.content), {
            ...commonProps,
            fontSize: l.fontSize,
            fontFamily: l.fontFamily,
            fontWeight: l.fontWeight as any,
            charSpacing: l.charSpacing,
            lineHeight: l.lineHeight,
            fontStyle: l.fontStyle,
            textAlign: (l.originX === 'center' ? 'center' : l.originX === 'right' ? 'right' : 'left') as any
          });
          if (l.content === 'productName' || l.content === 'price' || l.content === 'tagline') {
            (obj as any).name = l.content;
          }
        } else if (l.type === 'rect') {
          obj = new fabric.Rect({
            ...commonProps,
            width: resolve(l.width, canvasWidth, true),
            height: resolve(l.height, canvasHeight, false),
            rx: l.rx,
            ry: l.ry
          });
        } else if (l.type === 'circle') {
          obj = new fabric.Circle({
            ...commonProps,
            radius: l.radius
          });
        }

        if (obj) {
          if (l.id) (obj as any).id = l.id;
          canvas.add(obj);
        }
      });
      return; // If layers exist, we skip legacy UVTS rendering
    }

    // 2. Legacy UVTS Rendering (V1)
    if (uvts.structure?.info_layer) {
      const infoWidth = (uvts.structure.info_layer.width_pct / 100) * canvasWidth;
      const padding = (uvts.structure.info_layer.padding_pct / 100) * canvasWidth;
      const align = uvts.structure.info_layer.align;
      const startX = align === 'left' ? padding : canvasWidth - infoWidth + padding;

      // 1. Render Product Name
      const nameSpec = uvts.typography?.['#Product_Name'];
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
      const priceSpec = uvts.typography?.['#Price_Now'];
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
      const specSpec = uvts.typography?.['#Product_Spec'];
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
    const template = allTemplates.find(t => t.id === activeTemplate);

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const bg = fabricCanvas.backgroundImage;
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        if (bg) fabricCanvas.backgroundImage = bg;
        
        if (template) {
          if (template.isUVTS && template.uvtsData) {
            applyUVTSTemplate(fabricCanvas, batchItems[i], template.uvtsData);
          } else {
            template.apply(fabricCanvas, batchItems[i]);
          }
        }
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
