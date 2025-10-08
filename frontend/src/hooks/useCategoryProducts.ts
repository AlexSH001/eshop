import { useState, useEffect } from "react";
import { resolveProductImage } from "@/lib/utils";
import { useCategories } from "@/contexts/CategoriesContext";

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
}

interface UseCategoryProductsResult {
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

// Cache for products to avoid repeated API calls
const productsCache = new Map<string, { products: Product[]; timestamp: number }>();
const PRODUCTS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Rate limiting: track last request time per category
const lastRequestTime = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between requests

export function useCategoryProducts(categoryName: string, fallbackProducts: Product[]): UseCategoryProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getCategoryId, isLoading: categoriesLoading } = useCategories();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Wait for categories to load if they're still loading
        if (categoriesLoading) {
          return;
        }
        
        console.log(`Fetching ${categoryName} products from API...`);
        
        // Check if we have cached products for this category
        const cachedProducts = productsCache.get(categoryName);
        if (cachedProducts && Date.now() - cachedProducts.timestamp < PRODUCTS_CACHE_DURATION) {
          console.log(`Using cached products for ${categoryName}`);
          setProducts(cachedProducts.products || []);
          setIsLoading(false);
          return;
        }
        
        // Rate limiting: check if we made a request recently
        const lastRequest = lastRequestTime.get(categoryName) || 0;
        const timeSinceLastRequest = Date.now() - lastRequest;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          console.log(`Rate limiting: waiting ${MIN_REQUEST_INTERVAL - timeSinceLastRequest}ms before next request`);
          // Use fallback data if rate limited
          setProducts(fallbackProducts || []);
          setIsLoading(false);
          return;
        }
        
        // Get category ID from context
        const categoryId = getCategoryId(categoryName);
        if (!categoryId) {
          throw new Error(`${categoryName} category not found`);
        }
        
        console.log(`Found ${categoryName} category ID:`, categoryId);
        
        // Update last request time
        lastRequestTime.set(categoryName, Date.now());
        
        // Fetch products for the category
        const productsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/products/category/${categoryId}`
        );
        
        if (!productsResponse.ok) {
          const errorText = await productsResponse.text();
          console.error('API Error Response:', {
            status: productsResponse.status,
            statusText: productsResponse.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
        }
        
        const productsData = await productsResponse.json();
        console.log('API Response:', productsData);
        console.log('Products array:', productsData.products);
        console.log('Products length:', productsData.products?.length);
        
        // Handle different response formats
        let products = [];
        if (productsData.products && Array.isArray(productsData.products)) {
          products = productsData.products;
          console.log('Using productsData.products, count:', products.length);
        } else if (Array.isArray(productsData)) {
          products = productsData;
          console.log('Using productsData directly, count:', products.length);
        } else {
          console.error('Unexpected response format:', productsData);
        }
        
        if (!products || products.length === 0) {
          console.log('No products found in API response, using fallback data');
          setProducts(fallbackProducts || []);
          setIsLoading(false);
          return;
        }
        
        // Transform products to match frontend expectations
        const transformedProducts: Product[] = products.map((product: any) => {
          try {
            let dbImages: any[] = [];
            
            // Safely parse images field
            if (product.images) {
              try {
                // Check if it's already a string that looks like a path
                if (typeof product.images === 'string' && product.images.startsWith('/')) {
                  // It's a single image path, not JSON
                  dbImages = [product.images];
                } else {
                  // Try to parse as JSON
                  dbImages = JSON.parse(product.images);
                }
              } catch (error) {
                console.warn(`Failed to parse images for product ${product.id}:`, product.images, error);
                // If parsing fails, treat as single image path
                if (typeof product.images === 'string') {
                  dbImages = [product.images];
                } else {
                  dbImages = [];
                }
              }
            }
            
            const resolvedImage = resolveProductImage(product.featured_image, dbImages, product.id);
            
            return {
              id: product.id,
              name: product.name,
              price: product.price,
              originalPrice: product.original_price,
              image: resolvedImage,
              category: categoryName
            };
          } catch (error) {
            console.error(`Error transforming product ${product.id}:`, error);
            // Return a safe fallback product
            return {
              id: product.id || 0,
              name: product.name || 'Unknown Product',
              price: product.price || 0,
              originalPrice: product.original_price,
              image: '/static/images/default.jpg',
              category: categoryName
            };
          }
        });
        
        console.log('Transformed products:', transformedProducts);
        
        // Cache the products
        productsCache.set(categoryName, {
          products: transformedProducts,
          timestamp: Date.now()
        });
        
        setProducts(transformedProducts);
        
      } catch (err) {
        console.error('Error fetching products:', err);
        
        // Fallback to static data if API fails
        console.log('Falling back to static product data...');
        setProducts(fallbackProducts || []);
        
        if (err instanceof Error) {
          console.warn(`API failed, using fallback data: ${err.message}`);
        } else {
          console.warn('API failed, using fallback data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [categoryName, fallbackProducts, getCategoryId, categoriesLoading]);

  return { products: products || [], isLoading, error };
}
