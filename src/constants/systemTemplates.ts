import { UVTSTemplate } from '../types/uvts';

export const SYSTEM_TEMPLATES: UVTSTemplate[] = [
  {
    version: "2.0",
    style_name: "瑞士几何 / SWISS",
    description: "非对称排版，极具视觉冲击力",
    canvas: { ratio: "1:1", background: "#FFFFFF" },
    layers: [
      { type: 'rect', left: 0, top: 0, width: 60, height: "100%", fill: "brandColor", selectable: false },
      { type: 'text', content: "productName", left: 100, top: 120, fontSize: 110, fontWeight: 900, fontFamily: "Impact, sans-serif", fill: "#000000", lineHeight: 0.8, charSpacing: -40 },
      { type: 'text', content: "VALUE //", left: 105, top: 380, fontSize: 22, fontWeight: 900, fill: "#000000", charSpacing: 200 },
      { type: 'text', content: "price", left: 100, top: 400, fontSize: 260, fontWeight: 900, fontFamily: "Helvetica, Arial, sans-serif", fill: "brandColor", lineHeight: 1, charSpacing: -10 },
      { type: 'text', content: "tagline", left: 105, top: "90%", fontSize: 18, fontWeight: 'bold', fontFamily: "monospace", fill: "#000000", charSpacing: 150 }
    ],
    rules: { auto_shrink_text: true, currency_symbol_spacing: "0px" }
  },
  {
    version: "2.0",
    style_name: "期刊杂志 / COVER",
    description: "经典画报感，优雅且平衡",
    canvas: { ratio: "1:1", background: "#FFFFFF" },
    layers: [
      { type: 'rect', left: 50, top: 50, width: "90%", height: "90%", fill: "transparent", stroke: "brandColor", strokeWidth: 2, selectable: false },
      { type: 'text', content: "PHOTOX COLLECTIVE", left: "center", top: 100, fontSize: 28, fontWeight: 900, fontFamily: "Georgia, serif", fill: "brandColor", originX: 'center', charSpacing: 500 },
      { type: 'text', content: "productName", left: "center", top: "45%", fontSize: 84, fontWeight: "bold", fontFamily: "Georgia, serif", fill: "#000000", originX: 'center', fontStyle: 'italic' },
      { type: 'circle', radius: 80, fill: "brandColor", left: "center", top: "65%", originX: 'center', originY: 'center' },
      { type: 'text', content: "price", left: "center", top: "65%", fontSize: 48, fontWeight: "bold", fill: "#FFFFFF", originX: 'center', originY: 'center' },
      { type: 'text', content: "tagline", left: "center", top: "90%", fontSize: 12, fontWeight: "bold", fill: "#000000", originX: 'center', charSpacing: 300 }
    ],
    rules: { auto_shrink_text: true, currency_symbol_spacing: "0px" }
  },
  {
    version: "2.0",
    style_name: "街头潮流 / BRUTAL",
    description: "硬核工业感，适合个性表达",
    canvas: { ratio: "1:1", background: "#FFFFFF" },
    layers: [
      { type: 'rect', left: 0, top: "70%", width: "100%", height: "30%", fill: "#000000", selectable: false },
      { type: 'rect', left: 0, top: 200, width: "100%", height: 140, fill: "brandColor", stroke: "#000000", strokeWidth: 4 },
      { type: 'text', content: "productName", left: 40, top: 215, fontSize: 96, fontWeight: 900, fill: "#000000", fontFamily: "Arial Black" },
      { type: 'text', content: "COST //", left: 45, top: "75%", fontSize: 40, fontWeight: 900, fill: "brandColor" },
      { type: 'text', content: "price", left: 40, top: "80%", fontSize: 180, fontWeight: 900, fill: "#FFFFFF", fontFamily: "Impact" },
      { type: 'text', content: "tagline", left: 45, top: "94%", fontSize: 20, fontWeight: "bold", fill: "#FFFFFF", charSpacing: 200 }
    ],
    rules: { auto_shrink_text: true, currency_symbol_spacing: "0px" }
  },
  {
    version: "2.0",
    style_name: "雅致极简 / ZEN",
    description: "通透感与大量留白，宁静奢华",
    canvas: { ratio: "1:1", background: "#FFFFFF" },
    layers: [
      { type: 'rect', left: "center", top: 150, width: 200, height: 1, fill: "#333", originX: 'center' },
      { type: 'text', content: "productName", left: "center", top: 200, fontSize: 64, fontWeight: 200, fill: "#222", originX: 'center', charSpacing: 400 },
      { type: 'rect', left: "center", top: "80%", width: 140, height: 60, fill: "transparent", stroke: "brandColor", strokeWidth: 1, originX: 'center', originY: 'center' },
      { type: 'text', content: "price", left: "center", top: "80%", fontSize: 28, fontWeight: 300, fill: "#222", originX: 'center', originY: 'center' },
      { type: 'text', content: "tagline", left: "center", top: "88%", fontSize: 16, fontWeight: 300, fill: "#999", originX: 'center' }
    ],
    rules: { auto_shrink_text: true, currency_symbol_spacing: "0px" }
  },
  {
    version: "2.0",
    style_name: "工业参数 / TECH",
    description: "硬连接布局，展现极致专业性",
    canvas: { ratio: "1:1", background: "#FFFFFF" },
    layers: [
      { type: 'rect', left: 0, top: 0, width: "100%", height: 40, fill: "#000000" },
      { type: 'text', content: "DEVICEX_PRTCL // SYSTEM_OVERRIDE", left: 20, top: 12, fontSize: 16, fontWeight: "bold", fill: "#FFFFFF", fontFamily: "monospace" },
      { type: 'text', content: "productName", left: 40, top: 100, fontSize: 84, fontWeight: 900, fill: "brandColor", fontFamily: "Impact" },
      { type: 'rect', left: 40, top: 220, width: 380, height: 90, fill: "#000000" },
      { type: 'text', content: "price", left: 65, top: 240, fontSize: 56, fontWeight: "bold", fill: "#FFFFFF", fontFamily: "monospace" },
      { type: 'text', content: "tagline", left: 40, top: "85%", fontSize: 18, lineHeight: 1.4, fill: "#333333", fontFamily: "monospace", fontWeight: "bold" }
    ],
    rules: { auto_shrink_text: true, currency_symbol_spacing: "0px" }
  }
];
