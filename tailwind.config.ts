import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      zIndex: {
        'base': '0',
        'dropdown': '20',
        'sticky': '30',
        'header': '40',
        'modal': '50',
        'overlay': '60',
        'toast': '70',
        'max': '9999',
      },
    },
  },
};

export default config;
