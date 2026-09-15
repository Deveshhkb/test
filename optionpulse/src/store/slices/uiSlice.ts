import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeName = "dark" | "light";
export type Density = "comfortable" | "compact";

interface UiState {
  theme: ThemeName;
  density: Density;
  navOpen: boolean;
  analyticsCollapsed: boolean;
}

const THEME_KEY = "optionpulse.theme";
const DENSITY_KEY = "optionpulse.density";

function readStored<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

const initialState: UiState = {
  theme: readStored<ThemeName>(THEME_KEY, "dark", ["dark", "light"]),
  density: readStored<Density>(DENSITY_KEY, "comfortable", ["comfortable", "compact"]),
  navOpen: false,
  analyticsCollapsed: false,
};

function persist(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) - ignore.
  }
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeName>) {
      state.theme = action.payload;
      persist(THEME_KEY, action.payload);
    },
    toggleTheme(state) {
      state.theme = state.theme === "dark" ? "light" : "dark";
      persist(THEME_KEY, state.theme);
    },
    setDensity(state, action: PayloadAction<Density>) {
      state.density = action.payload;
      persist(DENSITY_KEY, action.payload);
    },
    setNavOpen(state, action: PayloadAction<boolean>) {
      state.navOpen = action.payload;
    },
    toggleAnalyticsCollapsed(state) {
      state.analyticsCollapsed = !state.analyticsCollapsed;
    },
  },
});

export const { setTheme, toggleTheme, setDensity, setNavOpen, toggleAnalyticsCollapsed } =
  uiSlice.actions;
export default uiSlice.reducer;
