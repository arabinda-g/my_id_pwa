import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "system" | "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (value: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "info-card-theme";

function resolveTheme(theme: Theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return "system";
  });

  const setTheme = (value: Theme) => {
    setThemeState(value);
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event("theme-change"));
  };

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };

    apply();

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handle = () => apply();
      media.addEventListener("change", handle);
      return () => media.removeEventListener("change", handle);
    }
  }, [theme]);

  useEffect(() => {
    const handle = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    };
    window.addEventListener("storage", handle);
    window.addEventListener("theme-change", handle);
    return () => {
      window.removeEventListener("storage", handle);
      window.removeEventListener("theme-change", handle);
    };
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
