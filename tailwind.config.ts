import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem', xl: '2.5rem' },
      screens: { '2xl': '1320px' },
    },
    extend: {
      colors: {
        // Spiritual tourism palette: golden, saffron, white, deep blue
        saffron: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc070',
          400: '#ff9a36',
          500: '#ff7d10',
          600: '#f05f06',
          700: '#c74607',
          800: '#9e380e',
          900: '#7f300f',
        },
        gold: {
          50: '#fdfcef',
          100: '#fbf6d0',
          200: '#f7eaa1',
          300: '#f1d868',
          400: '#ecc23a',
          500: '#d4af37',
          600: '#b8901f',
          700: '#936b1b',
          800: '#7a551d',
          900: '#68471d',
        },
        royal: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c3d0ff',
          300: '#9bb0ff',
          400: '#7185fc',
          500: '#4f5ef5',
          600: '#3a3ee9',
          700: '#2f2fce',
          800: '#1e1b8f',
          900: '#141155',
          950: '#0b0930',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gold-shine':
          'linear-gradient(120deg, #b8901f 0%, #ecc23a 25%, #fff4c2 50%, #ecc23a 75%, #b8901f 100%)',
        'saffron-royal':
          'linear-gradient(135deg, #ff7d10 0%, #d4af37 50%, #1e1b8f 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(20, 17, 85, 0.18)',
        gold: '0 10px 40px -10px rgba(212, 175, 55, 0.45)',
        'gold-lg': '0 20px 60px -15px rgba(212, 175, 55, 0.55)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'spin-slow': 'spin-slow 28s linear infinite',
        glow: 'glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
