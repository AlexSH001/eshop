"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface StoreSettings {
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
}

interface AppearanceSettings {
  primaryColor: string;
  logo: string;
  favicon: string;
  theme: 'light' | 'dark' | 'auto';
}

interface Settings {
  store: StoreSettings;
  appearance: AppearanceSettings;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const defaultSettings: Settings = {
  store: {
    name: 'Shop',
    description: '',
    email: '',
    phone: '',
    address: '',
    currency: 'SGD',
    timezone: 'UTC'
  },
  appearance: {
    primaryColor: '#000000',
    logo: '',
    favicon: '',
    theme: 'light'
  }
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: false,
  error: null,
  refresh: async () => {}
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/admin/settings/public`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const fetchedSettings = await response.json();
      
      // Merge with defaults
      setSettings({
        store: { ...defaultSettings.store, ...(fetchedSettings.store || {}) },
        appearance: { ...defaultSettings.appearance, ...(fetchedSettings.appearance || {}) }
      });

      // Apply favicon if set
      if (fetchedSettings.appearance?.favicon) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = fetchedSettings.appearance.favicon;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = fetchedSettings.appearance.favicon;
          document.head.appendChild(newLink);
        }
      }

      // Apply primary color as CSS variable
      if (fetchedSettings.appearance?.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', fetchedSettings.appearance.primaryColor);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError((err as Error).message);
      // Keep default settings on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // Listen for settings updates from admin page
    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('settingsUpdated', handleSettingsUpdate);
      
      return () => {
        window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      };
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

