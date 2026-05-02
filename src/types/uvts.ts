export interface UVTSLayer {
  type: 'text' | 'rect' | 'circle' | 'image' | 'line';
  id?: string;
  left: number | string;
  top: number | string;
  content?: string; // "productName", "price", "tagline" or static text
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fill?: string; // color hex or "brandColor"
  width?: number | string;
  height?: number | string;
  rx?: number;
  ry?: number;
  radius?: number;
  originX?: 'left' | 'center' | 'right';
  originY?: 'top' | 'center' | 'bottom';
  charSpacing?: number;
  lineHeight?: number;
  fontStyle?: 'normal' | 'italic';
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  selectable?: boolean;
}

export interface UVTSTemplate {
  version: string;
  style_name: string;
  description?: string;
  canvas: {
    ratio: string;
    background: string;
  };
  structure?: {
    info_layer: { width_pct: number; align: 'left' | 'right'; padding_pct: number };
    image_layer: { width_pct: number; position: 'left' | 'right'; fit: string };
  };
  typography?: {
    [key: string]: {
      font: string;
      size_em: number;
      weight: string;
      color?: string;
      decoration?: string;
      symbol_logic?: { content: string; scale: number; valign: string };
    };
  };
  layers?: UVTSLayer[]; // New powerful layering system
  rules: {
    auto_shrink_text: boolean;
    currency_symbol_spacing: string;
  };
}
