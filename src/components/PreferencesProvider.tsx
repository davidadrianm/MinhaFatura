'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_PREFERENCES, currencySymbol, type UserPreferences } from '@/lib/preferences';

const PreferencesContext = createContext<UserPreferences>(DEFAULT_PREFERENCES);

export function PreferencesProvider({
  value,
  children,
}: {
  value: UserPreferences;
  children: React.ReactNode;
}) {
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): UserPreferences {
  return useContext(PreferencesContext);
}

/** Símbolo da moeda escolhida no Perfil (ex.: "R$"). */
export function useCurrencySymbol(): string {
  return currencySymbol(useContext(PreferencesContext).currency);
}
