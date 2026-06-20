/**
 * 🍎 PhotoX Semantic Design System
 * 這些變數映射到 index.css 中的 CSS 變數
 */

export const designSystem = {
  // 色彩
  colors: {
    surface: {
      base: 'var(--color-surface-base)',
      soft: 'var(--color-surface-soft)',
      mute: 'var(--color-surface-mute)',
      card: 'var(--color-surface-card)',
    },
    text: {
      main: 'var(--color-text-main)',
      sub: 'var(--color-text-sub)',
      mute: 'var(--color-text-mute)',
    },
    brand: {
      primary: 'var(--color-primary)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      danger: 'var(--color-danger)',
    },
    border: {
      soft: 'var(--color-border-soft)',
      bold: 'var(--color-border-bold)',
    }
  },

  // 陰影
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },

  // 圓角
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },

  // 動畫
  animations: {
    ease: 'var(--ease-apple)',
    spring: 'var(--ease-spring)',
  }
};
