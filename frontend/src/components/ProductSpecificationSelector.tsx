"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SpecificationItem {
  name: string;
  values: Array<{
    name: string;
    priceChange?: number;
    originalPriceChange?: number;
  }>;
}

export interface SelectedSpecifications {
  [itemName: string]: string; // itemName -> selected value name
}

interface ProductSpecificationSelectorProps {
  specifications: {
    items?: SpecificationItem[];
  };
  selectedSpecs: SelectedSpecifications;
  onSpecChange: (specs: SelectedSpecifications) => void;
  basePrice: number;
  baseOriginalPrice?: number;
}

export default function ProductSpecificationSelector({
  specifications,
  selectedSpecs,
  onSpecChange,
  basePrice,
  baseOriginalPrice
}: ProductSpecificationSelectorProps) {
  const [calculatedPrice, setCalculatedPrice] = useState(basePrice);
  const [calculatedOriginalPrice, setCalculatedOriginalPrice] = useState(baseOriginalPrice);

  const items = specifications.items || [];

  // Initialize selected specs with first value of each item
  useEffect(() => {
    if (items.length > 0 && Object.keys(selectedSpecs).length === 0) {
      const initialSpecs: SelectedSpecifications = {};
      items.forEach(item => {
        if (item.values.length > 0) {
          initialSpecs[item.name] = item.values[0].name;
        }
      });
      onSpecChange(initialSpecs);
    }
  }, [items, selectedSpecs, onSpecChange]);

  // Calculate price based on selected specifications
  useEffect(() => {
    let priceChange = 0;
    let originalPriceChange = 0;

    items.forEach(item => {
      const selectedValue = selectedSpecs[item.name];
      if (selectedValue) {
        const value = item.values.find(v => v.name === selectedValue);
        if (value) {
          priceChange += value.priceChange || 0;
          originalPriceChange += value.originalPriceChange || 0;
        }
      }
    });

    setCalculatedPrice(basePrice + priceChange);
    if (baseOriginalPrice !== undefined) {
      setCalculatedOriginalPrice(baseOriginalPrice + originalPriceChange);
    }
  }, [selectedSpecs, items, basePrice, baseOriginalPrice]);

  const handleSpecChange = (itemName: string, valueName: string) => {
    const newSpecs = { ...selectedSpecs, [itemName]: valueName };
    onSpecChange(newSpecs);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Specifications</Label>
      {items.map((item, index) => (
        <div key={index} className="space-y-2">
          <Label className="text-sm font-medium capitalize">
            {item.name}:
          </Label>
          <Select
            value={selectedSpecs[item.name] || ''}
            onValueChange={(value) => handleSpecChange(item.name, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${item.name}`} />
            </SelectTrigger>
            <SelectContent>
              {item.values.map((value, valueIndex) => {
                const priceChange = value.priceChange || 0;
                const priceChangeText = priceChange !== 0 
                  ? ` (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)})`
                  : '';
                return (
                  <SelectItem key={valueIndex} value={value.name}>
                    {value.name}{priceChangeText}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ))}
      
      {/* Display calculated prices */}
      <div className="pt-2 border-t space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Price:</span>
          <span className="text-lg font-bold">
            ${calculatedPrice.toFixed(2)}
          </span>
        </div>
        {calculatedOriginalPrice !== undefined && calculatedOriginalPrice > calculatedPrice && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 line-through">
              ${calculatedOriginalPrice.toFixed(2)}
            </span>
            <Badge className="bg-red-500">
              {Math.round(((calculatedOriginalPrice - calculatedPrice) / calculatedOriginalPrice) * 100)}% OFF
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

