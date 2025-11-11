"use client";

import { useEffect, useState } from "react";
import CategoryPage from "@/components/CategoryPage";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { generateGradient } from "@/config/categoryGradients";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  image?: string;
  gradient_from?: string;
  gradient_to?: string;
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

  // Use stored gradient from database, or generate one if not set
  const gradient = category.gradient_from && category.gradient_to
    ? { from: category.gradient_from, to: category.gradient_to }
    : generateGradient(category.name);
  
  const description = category.description || `Browse our collection of ${category.name} products`;

  return (
    <CategoryPage
      categoryName={category.name}
      categorySlug={category.slug}
      description={description}
      gradientFrom={gradient.from}
      gradientTo={gradient.to}
      image={category.image}
    />
  );
}

