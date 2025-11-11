import { useSettings } from "@/contexts/SettingsContext";

/**
 * Format a number as currency using the store's currency setting
 */
export function formatCurrency(amount: number, currency?: string): string {
  const settings = typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('settings') || '{}') : null;
  
  const currencyCode = currency || settings?.store?.currency || 'SGD';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Hook to format currency using settings
 */
export function useCurrency() {
  const { settings } = useSettings();
  const currency = settings?.store?.currency || 'SGD';
  
  return {
    currency,
    format: (amount: number) => formatCurrency(amount, currency),
  };
}

