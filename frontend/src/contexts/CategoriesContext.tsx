"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
}

interface CategoriesContextType {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  getCategoryId: (categoryName: string) => number | null;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if we have cached categories in localStorage
        const cachedCategories = localStorage.getItem('categories');
        const cacheTime = localStorage.getItem('categoriesCacheTime');
        
        if (cachedCategories && cacheTime) {
          const timeDiff = Date.now() - parseInt(cacheTime);
          if (timeDiff < 5 * 60 * 1000) { // 5 minutes cache
            console.log('Using cached categories from localStorage');
            setCategories(JSON.parse(cachedCategories));
            setIsLoading(false);
            return;
          }
        }
        
        console.log('Fetching categories from API...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://fortunewhisper.com/backend/api'}/categories`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        setCategories(data.categories);
        
        // Cache categories in localStorage
        localStorage.setItem('categories', JSON.stringify(data.categories));
        localStorage.setItem('categoriesCacheTime', Date.now().toString());
        
        console.log('Categories fetched and cached');
        
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoryId = (categoryName: string): number | null => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.id : null;
  };

  return (
    <CategoriesContext.Provider value={{ categories, isLoading, error, getCategoryId }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}
