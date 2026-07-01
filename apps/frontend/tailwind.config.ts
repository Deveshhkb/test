import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // Dark mode is toggled by adding the `dark` class to <html>.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // `ink` (foreground) and the surface tokens are backed by CSS variables
        // so they flip automatically in dark mode — every existing
        // text-ink/xx, border-ink/xx, bg-ink/xx utility adapts with no rewrites.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        carbon: 'rgb(var(--carbon) / <alpha-value>)',
        nova: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          200: '#d9d6fe',
          300: '#bdb4fe',
          400: '#9b87fc',
          500: '#7c5cf6',
          600: '#6d3eec',
          700: '#5d2dd8',
          800: '#4d26b5',
          900: '#402394',
        },
        accent: '#ff5b5b',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 24s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
