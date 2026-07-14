import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

/**
 * Savora design tokens — warm charcoal + ember.
 * An original identity: warm neutrals instead of stark white,
 * a single ember accent, generous radii, soft elevation.
 */
export const palette = {
  ember: '#E4572E',
  emberSoft: '#FCE9E2',
  emberBright: '#FF7A4D',
  mint: '#2EC4A6',
  gold: '#F2B441',
  danger: '#D64545',
  success: '#2E9E5B',
};

export const lightColors = {
  background: '#FBF8F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE6',
  text: '#1D1A16',
  textMuted: '#6E675E',
  border: '#EDE7DE',
  primary: palette.ember,
  primarySoft: palette.emberSoft,
  onPrimary: '#FFFFFF',
  ...palette,
};

export const darkColors: typeof lightColors = {
  background: '#14110D',
  surface: '#1E1A15',
  surfaceAlt: '#282219',
  text: '#F5EFE7',
  textMuted: '#A39A8D',
  border: '#2C261F',
  primary: palette.emberBright,
  primarySoft: '#3A2419',
  onPrimary: '#14110D',
  ...palette,
  ember: palette.emberBright,
};

export type ThemeColors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 8, md: 14, lg: 20, xl: 28, full: 999 } as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

/** Resolves the active color set: user preference ('system' | 'light' | 'dark') + OS scheme. */
export const useTheme = () => {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme = preference === 'system' ? (systemScheme ?? 'light') : preference;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, scheme, isDark: scheme === 'dark' };
};
