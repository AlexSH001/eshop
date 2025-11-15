"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProductVariant {
  [key: string]: string; // e.g., { color: "red", size: "large" }
}

export interface VariantOption {
  name: string;
  values: string[];
  type?: 'color' | 'text' | 'size';
}

interface ProductVariantSelectorProps {
  attributes: Record<string, any>; // Product attributes from backend
  selectedVariant: ProductVariant;
  onVariantChange: (variant: ProductVariant) => void;
  availableVariants?: Array<{
    attributes: ProductVariant;
    sku?: string;
    price?: number;
    stock?: number;
    image?: string;
  }>;
}

export default function ProductVariantSelector({
  attributes,
  selectedVariant,
  onVariantChange,
  availableVariants = []
}: ProductVariantSelectorProps) {
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);

  useEffect(() => {
    // Parse attributes to extract variant options
    // Expected format: { color: ["red", "blue", "green"], size: ["S", "M", "L"] }
    // Or: { variants: { color: ["red", "blue"], size: ["S", "M"] } }
    
    const options: VariantOption[] = [];
    
    // Check if attributes has a 'variants' key
    if (attributes.variants && typeof attributes.variants === 'object') {
      Object.entries(attributes.variants).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          options.push({
            name: key,
            values: value,
            type: key.toLowerCase().includes('color') ? 'color' : 
                  key.toLowerCase().includes('size') ? 'size' : 'text'
          });
        }
      });
    } else {
      // Direct format: { color: ["red", "blue"], size: ["S", "M"] }
      Object.entries(attributes).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          options.push({
            name: key,
            values: value,
            type: key.toLowerCase().includes('color') ? 'color' : 
                  key.toLowerCase().includes('size') ? 'size' : 'text'
          });
        }
      });
    }
    
    setVariantOptions(options);
    
    // Initialize selected variant with first option of each variant type
    if (options.length > 0 && Object.keys(selectedVariant).length === 0) {
      const initialVariant: ProductVariant = {};
      options.forEach(option => {
        if (option.values.length > 0) {
          initialVariant[option.name] = option.values[0];
        }
      });
      onVariantChange(initialVariant);
    }
  }, [attributes, onVariantChange]);

  const handleVariantSelect = (optionName: string, value: string) => {
    const newVariant = { ...selectedVariant, [optionName]: value };
    onVariantChange(newVariant);
  };

  // Check if a variant combination is available
  const isVariantAvailable = (variant: ProductVariant): boolean => {
    if (availableVariants.length === 0) return true; // If no variants defined, assume available
    
    return availableVariants.some(av => {
      return Object.keys(variant).every(key => av.attributes[key] === variant[key]);
    });
  };

  // Get stock for selected variant
  const getSelectedVariantStock = (): number | null => {
    if (availableVariants.length === 0) return null;
    
    const matchingVariant = availableVariants.find(av => {
      return Object.keys(selectedVariant).every(key => av.attributes[key] === selectedVariant[key]);
    });
    
    return matchingVariant?.stock ?? null;
  };

  const selectedStock = getSelectedVariantStock();

  if (variantOptions.length === 0) {
    return null; // No variants to display
  }

  return (
    <div className="space-y-4">
      {variantOptions.map((option) => (
        <div key={option.name} className="space-y-2">
          <Label className="text-sm font-medium capitalize">
            {option.name}:
            {selectedVariant[option.name] && (
              <span className="ml-2 text-gray-600 font-normal">
                {selectedVariant[option.name]}
              </span>
            )}
          </Label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const testVariant = { ...selectedVariant, [option.name]: value };
              const isAvailable = isVariantAvailable(testVariant);
              const isSelected = selectedVariant[option.name] === value;

              if (option.type === 'color') {
                // Color swatch
                const colorValue = value.toLowerCase();
                const isHexColor = /^#[0-9A-F]{6}$/i.test(colorValue);
                
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleVariantSelect(option.name, value)}
                    disabled={!isAvailable}
                    className={`
                      relative w-10 h-10 rounded-full border-2 transition-all
                      ${isSelected ? 'border-gray-900 scale-110' : 'border-gray-300'}
                      ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
                    `}
                    style={{
                      backgroundColor: isHexColor ? colorValue : undefined,
                    }}
                    title={`${value}${!isAvailable ? ' (Out of stock)' : ''}`}
                  >
                    {!isHexColor && (
                      <span className="text-xs">{value.charAt(0)}</span>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full border border-gray-900" />
                      </div>
                    )}
                  </button>
                );
              } else {
                // Text/Size button
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleVariantSelect(option.name, value)}
                    disabled={!isAvailable}
                    className={`
                      min-w-[3rem]
                      ${isSelected ? 'bg-gray-900 text-white' : ''}
                      ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {value}
                  </Button>
                );
              }
            })}
          </div>
        </div>
      ))}
      
      {selectedStock !== null && (
        <div className="text-sm">
          {selectedStock > 0 ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              {selectedStock} in stock
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-600">
              Out of stock
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

