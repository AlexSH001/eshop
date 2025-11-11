"use client";

import { useEffect, useState } from "react";
import CategoryPage from "@/components/CategoryPage";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// Fallback gradient configurations for known categories (optional, for better UX)
const gradientPresets: Record<string, { from: string; to: string }> = {
  'automotive': { from: 'from-red-600', to: 'to-orange-600' },
  'books': { from: 'from-blue-600', to: 'to-purple-600' },
  'electronics': { from: 'from-gray-700', to: 'to-gray-900' },
  'fashion': { from: 'from-pink-600', to: 'to-rose-600' },
  'gaming': { from: 'from-green-600', to: 'to-emerald-600' },
  'home-garden': { from: 'from-green-500', to: 'to-teal-600' },
  'music': { from: 'from-purple-600', to: 'to-indigo-600' },
  'photography': { from: 'from-cyan-600', to: 'to-blue-600' },
  'sports': { from: 'from-orange-500', to: 'to-red-600' },
  'baby-kids': { from: 'from-yellow-400', to: 'to-pink-500' },
};

// Generate gradient based on category name (for new categories)
function generateGradient(categoryName: string): { from: string; to: string } {
  // Use preset if available
  const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
  if (gradientPresets[slug]) {
    return gradientPresets[slug];
  }
  
  // Generate consistent gradient based on category name hash
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    { from: 'from-blue-600', to: 'to-purple-600' },
    { from: 'from-green-600', to: 'to-teal-600' },
    { from: 'from-orange-600', to: 'to-red-600' },
    { from: 'from-purple-600', to: 'to-pink-600' },
    { from: 'from-cyan-600', to: 'to-blue-600' },
    { from: 'from-yellow-500', to: 'to-orange-600' },
    { from: 'from-indigo-600', to: 'to-purple-600' },
    { from: 'from-emerald-600', to: 'to-green-600' },
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  image?: string;
}

export default function CategorySlugPage({ params }: { params: { slug: string } }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all categories and find the one matching the slug
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/categories`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        const foundCategory = data.categories.find(
          (cat: Category) => cat.slug === params.slug || 
          cat.slug === params.slug.replace(/-/g, '_') ||
          cat.name.toLowerCase().replace(/\s+/g, '-') === params.slug
        );
        
        if (!foundCategory) {
          setError('Category not found');
          return;
        }
        
        setCategory(foundCategory);
      } catch (err) {
        console.error('Error fetching category:', err);
        setError(err instanceof Error ? err.message : 'Failed to load category');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Loading category...</span>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The category you\'re looking for doesn\'t exist.'}
          </p>
          <Link href="/categories" className="text-blue-600 hover:underline">
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }

  const gradient = generateGradient(category.name);
  const description = category.description || `Browse our collection of ${category.name} products`;

  return (
    <CategoryPage
      categoryName={category.name}
      categorySlug={category.slug}
      description={description}
      gradientFrom={gradient.from}
      gradientTo={gradient.to}
    />
  );
}

