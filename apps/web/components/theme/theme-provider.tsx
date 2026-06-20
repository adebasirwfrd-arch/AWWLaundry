'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'aww-theme';

interface ThemeContextValue {
  theme: ThemePreference;
  effective: EffectiveTheme;
  setTheme: (theme: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveEffective(pref: ThemePreference): EffectiveTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return pref;
}

function applyTheme(effective: EffectiveTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.setAttribute('data-theme', effective);
  root.style.colorScheme = effective;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [effective, setEffective] = useState<EffectiveTheme>('light');

  useEffect(() => {
    let stored: ThemePreference = 'system';
    try {
      const raw = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      if (raw === 'light' || raw === 'dark' || raw === 'system') stored = raw;
    } catch {
      // ignore
    }
    setThemeState(stored);
    const eff = resolveEffective(stored);
    setEffective(eff);
    applyTheme(eff);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const eff = mq.matches ? 'dark' : 'light';
      setEffective(eff);
      applyTheme(eff);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const eff = resolveEffective(next);
    setEffective(eff);
    applyTheme(eff);
  }, []);

  const toggle = useCallback(() => {
    setTheme(effective === 'dark' ? 'light' : 'dark');
  }, [effective, setTheme]);

  const value = useMemo(
    () => ({ theme, effective, setTheme, toggle }),
    [theme, effective, setTheme, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
