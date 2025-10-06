"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

export type Theme = "ocean" | "sunset" | "forest" | "purple" | "cherry";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("ocean");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem("sword-theme") as Theme | null;
    const initialTheme = saved ?? "ocean";

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("sword-theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const themeOptions = [
  {
    value: 'ocean' as Theme,
    name: 'Ocean Depths',
    description: 'Deep blues and teals',
    preview: 'bg-gradient-to-r from-blue-500 to-teal-500'
  },
  {
    value: 'sunset' as Theme,
    name: 'Sunset Glory',
    description: 'Warm oranges and pinks',
    preview: 'bg-gradient-to-r from-orange-500 to-pink-500'
  },
  {
    value: 'forest' as Theme,
    name: 'Forest Path',
    description: 'Rich greens and earth tones',
    preview: 'bg-gradient-to-r from-green-500 to-emerald-600'
  },
  {
    value: 'purple' as Theme,
    name: 'Royal Purple',
    description: 'Deep purples and violets',
    preview: 'bg-gradient-to-r from-purple-500 to-violet-600'
  },
  {
    value: 'cherry' as Theme,
    name: 'Cherry Blossom',
    description: 'Soft pinks and roses',
    preview: 'bg-gradient-to-r from-rose-400 to-pink-500'
  }
];
