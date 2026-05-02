export interface UVTSTemplate {
  version: string;
  style_name: string;
  canvas: {
    ratio: string;
    background: string;
  };
  structure: {
    info_layer: { width_pct: number; align: 'left' | 'right'; padding_pct: number };
    image_layer: { width_pct: number; position: 'left' | 'right'; fit: string };
  };
  typography: {
    [key: string]: {
      font: string;
      size_em: number;
      weight: string;
      color?: string;
      decoration?: string;
      symbol_logic?: { content: string; scale: number; valign: string };
    };
  };
  rules: {
    auto_shrink_text: boolean;
    currency_symbol_spacing: string;
  };
}
