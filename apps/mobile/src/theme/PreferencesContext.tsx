import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from '../storage/preferences';
import { type ColorTokens, darkColors, lightColors, radius, spacing, typography } from './tokens';

interface PreferencesContextValue {
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  colors: ColorTokens;
  scheme: 'light' | 'dark';
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPreferences().then((loaded) => {
      setPrefsState(loaded);
      setReady(true);
    });
  }, []);

  function setPrefs(patch: Partial<Preferences>) {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }

  const scheme: 'light' | 'dark' =
    prefs.appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prefs.appearance;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({ prefs, setPrefs, colors, scheme, spacing, radius, typography, ready }),
    [prefs, colors, scheme, ready]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

/** Convenience hook for screens that only need visual tokens. */
export function useTheme() {
  const { colors, spacing, radius, typography, scheme } = usePreferences();
  return { colors, spacing, radius, typography, scheme };
}
