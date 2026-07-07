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
        // Sunset Coral palette
        nova: {
          50: '#fff1f2',
          100: '#ffe1e4',
          200: '#ffc7cd',
          300: '#ff9fab',
          400: '#fa7183',
          500: '#f5566a',
          600: '#f0475b',
          700: '#d9314a',
          800: '#b51f3a',
          900: '#971b33',
        },
        accent: '#ff8a3d',
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
