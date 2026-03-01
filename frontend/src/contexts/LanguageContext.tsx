import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeLocale, setLocale as setI18nLocale, getLocale, t } from '../services/i18n';

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  t: (key: string, options?: object) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLocale().then((savedLocale) => {
      setLocaleState(savedLocale);
      setIsLoading(false);
    });
  }, []);

  const setLocale = async (newLocale: string) => {
    await setI18nLocale(newLocale);
    setLocaleState(newLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
