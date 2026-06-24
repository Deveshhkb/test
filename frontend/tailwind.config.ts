import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF7A00',
          50: '#FFF3E8',
          100: '#FFE2C5',
          400: '#FF9433',
          500: '#FF7A00',
          600: '#E06A00',
          700: '#B85700',
        },
        secondary: {
          DEFAULT: '#D4AF37',
          400: '#E0C45C',
          600: '#B8962A',
        },
        ink: '#222222',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-poppins)', 'var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(0,0,0,0.18)',
        glow: '0 8px 40px -8px rgba(255,122,0,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        float: 'float 4s ease-in-out infinite',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, rgba(34,34,34,0.75) 0%, rgba(184,87,0,0.55) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
