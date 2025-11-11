/**
 * Centralized category gradient color presets
 * These are used as fallbacks when a category doesn't have custom colors set
 */

export interface GradientPreset {
  from: string;
  to: string;
  label: string;
}

export const gradientPresets: Record<string, GradientPreset> = {
  'automotive': { 
    from: 'from-red-600', 
    to: 'to-orange-600',
    label: 'Red to Orange'
  },
  'books': { 
    from: 'from-blue-600', 
    to: 'to-purple-600',
    label: 'Blue to Purple'
  },
  'electronics': { 
    from: 'from-gray-700', 
    to: 'to-gray-900',
    label: 'Dark Gray'
  },
  'fashion': { 
    from: 'from-pink-600', 
    to: 'to-rose-600',
    label: 'Pink to Rose'
  },
  'gaming': { 
    from: 'from-green-600', 
    to: 'to-emerald-600',
    label: 'Green to Emerald'
  },
  'home-garden': { 
    from: 'from-green-500', 
    to: 'to-teal-600',
    label: 'Green to Teal'
  },
  'music': { 
    from: 'from-purple-600', 
    to: 'to-indigo-600',
    label: 'Purple to Indigo'
  },
  'photography': { 
    from: 'from-cyan-600', 
    to: 'to-blue-600',
    label: 'Cyan to Blue'
  },
  'sports': { 
    from: 'from-orange-500', 
    to: 'to-red-600',
    label: 'Orange to Red'
  },
  'baby-kids': { 
    from: 'from-yellow-400', 
    to: 'to-pink-500',
    label: 'Yellow to Pink'
  },
};

// Available gradient options for dropdown
export const availableGradients: GradientPreset[] = [
  { from: 'from-blue-600', to: 'to-purple-600', label: 'Blue to Purple' },
  { from: 'from-green-600', to: 'to-teal-600', label: 'Green to Teal' },
  { from: 'from-orange-600', to: 'to-red-600', label: 'Orange to Red' },
  { from: 'from-purple-600', to: 'to-pink-600', label: 'Purple to Pink' },
  { from: 'from-cyan-600', to: 'to-blue-600', label: 'Cyan to Blue' },
  { from: 'from-yellow-500', to: 'to-orange-600', label: 'Yellow to Orange' },
  { from: 'from-indigo-600', to: 'to-purple-600', label: 'Indigo to Purple' },
  { from: 'from-emerald-600', to: 'to-green-600', label: 'Emerald to Green' },
  { from: 'from-pink-600', to: 'to-rose-600', label: 'Pink to Rose' },
  { from: 'from-red-600', to: 'to-orange-600', label: 'Red to Orange' },
  { from: 'from-gray-700', to: 'to-gray-900', label: 'Dark Gray' },
  { from: 'from-violet-600', to: 'to-purple-600', label: 'Violet to Purple' },
];

// Generate gradient based on category name (for new categories without preset)
export function generateGradient(categoryName: string): GradientPreset {
  const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
  if (gradientPresets[slug]) {
    return gradientPresets[slug];
  }
  
  // Generate consistent gradient based on category name hash
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return availableGradients[Math.abs(hash) % availableGradients.length];
}

