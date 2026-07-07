import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        brand: {
          50: '#fff1f2',
          100: '#ffe1e4',
          500: '#f5566a',
          600: '#f0475b',
          700: '#d9314a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
