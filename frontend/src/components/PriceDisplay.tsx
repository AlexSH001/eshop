"use client";

import { useSettings } from "@/contexts/SettingsContext";

interface PriceDisplayProps {
  price: number;
  className?: string;
}

export default function PriceDisplay({ price, className = "" }: PriceDisplayProps) {
  const { settings } = useSettings();
  const currency = settings?.store?.currency || 'USD';
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

  return <span className={className}>{formatted}</span>;
}

