import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        brand: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          500: '#7c5cf6',
          600: '#6d3eec',
          700: '#5d2dd8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
