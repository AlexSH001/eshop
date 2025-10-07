import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
}

export const fetchProducts1 = async () => {
  try {
    // setIsLoading(true);
    // setError(null);
    
    console.log('Starting to fetch products...');
    
    // Fetch all products with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/products?limit=50`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    
    const data: { products: Record<string, unknown>[] } = await response.json();
    
    console.log('API Response:', data);
    console.log('Products count:', data.products.length);
    
    if (!data.products || data.products.length === 0) {
      throw new Error('No products found in API response');
    }
    const groupedProducts: Record<string, Product[]> = {};
    data.products.forEach((product: Record<string, unknown>) => {
      const categoryName = product.category_name as string;
          if (!groupedProducts[categoryName]) {
            groupedProducts[categoryName] = [];
          }
          
          // Transform product data to match frontend expectations
          const dbImages = (product.images as unknown) as unknown[] | undefined;
          const featuredImage = (product as any).featured_image as string | null | undefined;
          const resolvedImage = resolveProductImage(featuredImage, dbImages, product.id as number);

          const transformedProduct: Product = {
            id: product.id as number,
            name: product.name as string,
            price: product.price as number,
            originalPrice: product.original_price as number | undefined,
            image: resolvedImage,
            category: categoryName
          };
          
          console.log(`Product ${transformedProduct.id}: ${transformedProduct.name} - Image: ${transformedProduct.image}`);
          
          groupedProducts[categoryName].push(transformedProduct);
        });
        console.log('Grouped products:', groupedProducts);
        
        // setCategoryProducts(groupedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      
      if (err instanceof Error) {
        console.warn(`API failed, using fallback data: ${err.message}`);
      } else {
        console.warn('API failed, using fallback data');
      }
    // } finally {
    //   setIsLoading(false);
    }
  };


export const fetchProducts = async () => {
  try {
   
    console.log('Starting to fetch products...');
    
    // Fetch all products with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/products?limit=50`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    
    const data: { products: Record<string, unknown>[] } = await response.json();
    
    console.log('API Response:', data);
    console.log('Products count:', data.products.length);
    
    if (!data.products || data.products.length === 0) {
      throw new Error('No products found in API response');
    }
    return data.products;
  } catch (err) {
    console.error('Error fetching products:', err);
    
    if (err instanceof Error) {
      console.warn(`API failed, using fallback data: ${err.message}`);
    } else {
      console.warn('API failed, using fallback data');
    }
    return [];
  }
};

export function fetchGroupedProducts() {
  const groupedProducts: Record<string, Product[]> = {};
  fetchProducts().then(products => {
    // Group products by category
    products.forEach((product: Record<string, unknown>) => {
      const categoryName = product.category_name as string;
      if (!groupedProducts[categoryName]) {
        groupedProducts[categoryName] = [];
      }
      // Transform product data to match frontend expectations
      const dbImages = (product.images as unknown) as unknown[] | undefined;
      const featuredImage = (product as any).featured_image as string | null | undefined;
      const resolvedImage = resolveProductImage(featuredImage, dbImages, product.id as number);

      const transformedProduct: Product = {
        id: product.id as number,
        name: product.name as string,
        price: product.price as number,
        originalPrice: product.original_price as number | undefined,
        image: resolvedImage,
        category: categoryName
      };
      
      console.log(`Product ${transformedProduct.id}: ${transformedProduct.name} - Image: ${transformedProduct.image}`);
      
      groupedProducts[categoryName].push(transformedProduct);
    });
    
    console.log('Grouped products:', groupedProducts);
    
  });
  return groupedProducts;
};


// -------------------------------
const defaultProductImage = "/static/images/products/product_1001.jpg";
const defaultCategoryImage = "/static/images/categories/category_1001.jpg";
const defaultBannerImage = "/static/images/banners/banner_1.jpg";
const defaultImage = "/static/images/default.jpg";

// Check if an image URL is valid (not a broken uploads path)
export const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') {
        console.log('isValidImageUrl: invalid input', { url, type: typeof url });
        return false;
    }
    
    // If it's a broken uploads path that doesn't exist, consider it invalid
    if (url.includes('/uploads/products/') && url.includes('/1.jpg')) {
        console.log('isValidImageUrl: broken uploads path detected', url);
        return false;
    }
    
    // If it's a valid external URL, static path, or uploaded image, it's valid
    const isValid = url.startsWith('http') || 
           url.startsWith('/static/') || 
           url.startsWith('/uploads/images/') ||
           url.startsWith('/uploads/products/'); // Allow uploaded product images (including category subfolders)
    
    console.log('isValidImageUrl result:', { url, isValid });
    return isValid;
};

// Convert backend upload URLs to frontend accessible URLs
export const normalizeImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    
    // If it's a backend upload URL, convert it to frontend accessible URL
    if (url.startsWith('/uploads/')) {
        return `http://localhost:3001${url}`;
    }
    
    return url;
};

// Resolve product image with proper fallback logic
export const resolveProductImage = (featuredImage: string | null | undefined, images: unknown[] | undefined, productId: number): string => {
    // Debug logging
    console.log('resolveProductImage called with:', {
        featuredImage,
        images,
        productId
    });
    
    // First try featured_image if it's valid
    if (featuredImage && isValidImageUrl(featuredImage)) {
        const normalizedUrl = normalizeImageUrl(featuredImage);
        console.log('Using featured image:', normalizedUrl);
        return normalizedUrl;
    }
    
    // Then try first image from images array if it's valid
    if (images && Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        let firstImageUrl: string | undefined;
        
        if (typeof firstImage === 'string') {
            firstImageUrl = firstImage;
        } else if (firstImage && typeof firstImage === 'object') {
            const imgObj = firstImage as Record<string, unknown>;
            firstImageUrl = (imgObj.image || imgObj.url || imgObj.src) as string | undefined;
        }
        
        if (firstImageUrl && isValidImageUrl(firstImageUrl)) {
            const normalizedUrl = normalizeImageUrl(firstImageUrl);
            console.log('Using first image from array:', normalizedUrl);
            return normalizedUrl;
        }
    }
    
    // Fallback to default image
    const fallbackUrl = defaultImage;
    console.log('Using fallback image:', fallbackUrl);
    return fallbackUrl;
};