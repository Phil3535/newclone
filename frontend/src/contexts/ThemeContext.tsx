import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  tabBar: string;
  tabBarBorder: string;
  input: string;
  inputBorder: string;
}

interface OrganizationBranding {
  company_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  support_email: string | null;
  support_phone: string | null;
  website_url: string | null;
}

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  branding: OrganizationBranding;
  setBranding: (branding: Partial<OrganizationBranding>) => void;
  organizationId: string | null;
  setOrganizationId: (id: string | null) => void;
  loadOrganizationBranding: (slug: string) => Promise<void>;
}

const DEFAULT_BRANDING: OrganizationBranding = {
  company_name: 'Solar Empire',
  logo_url: null,
  favicon_url: null,
  primary_color: '#f59e0b',
  secondary_color: '#3b82f6',
  accent_color: '#22c55e',
  background_color: '#0a1628',
  text_color: '#ffffff',
  support_email: null,
  support_phone: null,
  website_url: null,
};

const darkColors: ThemeColors = {
  background: '#0a1628',
  card: '#0f1a2e',
  cardBorder: '#1e3a5f',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  primary: '#f59e0b',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  tabBar: '#0f1a2e',
  tabBarBorder: '#1e3a5f',
  input: '#1e3a5f',
  inputBorder: '#334155',
};

const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  text: '#1e293b',
  textSecondary: '#64748b',
  primary: '#f59e0b',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
  input: '#f1f5f9',
  inputBorder: '#cbd5e1',
};

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [branding, setBrandingState] = useState<OrganizationBranding>(DEFAULT_BRANDING);
  const [organizationId, setOrganizationIdState] = useState<string | null>(null);

  useEffect(() => {
    loadTheme();
    loadBranding();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const loadBranding = async () => {
    try {
      const savedBranding = await AsyncStorage.getItem('organizationBranding');
      if (savedBranding) {
        setBrandingState({ ...DEFAULT_BRANDING, ...JSON.parse(savedBranding) });
      }
      const savedOrgId = await AsyncStorage.getItem('organizationId');
      if (savedOrgId) {
        setOrganizationIdState(savedOrgId);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setBranding = async (newBranding: Partial<OrganizationBranding>) => {
    const updatedBranding = { ...branding, ...newBranding };
    setBrandingState(updatedBranding);
    try {
      await AsyncStorage.setItem('organizationBranding', JSON.stringify(updatedBranding));
    } catch (error) {
      console.error('Error saving branding:', error);
    }
  };

  const setOrganizationId = async (id: string | null) => {
    setOrganizationIdState(id);
    try {
      if (id) {
        await AsyncStorage.setItem('organizationId', id);
      } else {
        await AsyncStorage.removeItem('organizationId');
      }
    } catch (error) {
      console.error('Error saving organization ID:', error);
    }
  };

  const loadOrganizationBranding = async (slug: string) => {
    try {
      const response = await fetch(`${API_URL}/api/organizations/branding/${slug}`);
      if (response.ok) {
        const data = await response.json();
        if (data.found && data.branding) {
          setBranding(data.branding);
          if (data.organization_id) {
            setOrganizationId(data.organization_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization branding:', error);
    }
  };

  // Apply branding colors to theme
  const baseColors = theme === 'dark' ? darkColors : lightColors;
  const colors: ThemeColors = {
    ...baseColors,
    primary: branding.primary_color || baseColors.primary,
    accent: branding.secondary_color || baseColors.accent,
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      colors, 
      toggleTheme, 
      setTheme,
      branding,
      setBranding,
      organizationId,
      setOrganizationId,
      loadOrganizationBranding,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { DEFAULT_BRANDING };
