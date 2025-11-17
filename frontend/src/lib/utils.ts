import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LucideIcon, Smartphone, ShoppingBag, Home as HomeIcon, Gamepad2, Dumbbell, Camera, Book, Car, Music, Baby } from "lucide-react";
import { allCategories } from "@/data/categories";

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

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: LucideIcon;
  image: string;
  href?: string;
  productCount?: number;
}

// Map category names to their corresponding icons
const getCategoryIcon = (categoryName: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    'Electronics': Smartphone,
    'Fashion': ShoppingBag,
    'Home & Garden': HomeIcon,
    'Gaming': Gamepad2,
    'Sports': Dumbbell,
    'Photography': Camera,
    'Books': Book,
    'Automotive': Car,
    'Music': Music,
    'Baby & Kids': Baby,
    'Baby': Baby,
    'Kids': Baby
  };
  
  return iconMap[categoryName] || ShoppingBag; // Default to ShoppingBag if not found
};

export const fetchCategories = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/categories`);
    const data = await response.json();
    
    // Process categories to ensure they have required properties
    const processedCategories = data.categories.map((category: any) => ({
      ...category,
      href: category.href || `/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`,
      icon: getCategoryIcon(category.name),
      image: category.image || `/uploads/categories/category_${category.slug || category.name.toLowerCase().replace(/\s+/g, '_')}.jpg`
    }));
    
    return processedCategories;
  }
  catch (err) {
    console.error('Error fetching categories:', err);
    if (err instanceof Error) {
      console.warn(`API failed, using fallback data: ${err.message}`);
    } else {
      console.warn('API failed, using fallback data');
    }
    // Return static categories as fallback
    return allCategories.map(category => ({
      ...category,
      slug: category.href?.replace('/categories/', '') || category.name.toLowerCase().replace(/\s+/g, '-')
    }));
  }
};


export const fetchProducts = async () => {
  try {
   
    console.log('Starting to fetch products...');
    
    // Fetch all products with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products?limit=50`, {
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

export async function fetchGroupedProducts(): Promise<Record<string, Product[]>> {
  const groupedProducts: Record<string, Product[]> = {};
  
  try {
    const products = await fetchProducts();
    
    // Group products by category
    products.forEach((product: Record<string, unknown>) => {
      const categoryName = product.category_name as string;
      if (!groupedProducts[categoryName]) {
        groupedProducts[categoryName] = [];
      }
      // Transform product data to match frontend expectations
      const dbImages = (product.images as unknown) as unknown[] | undefined;
      const featuredImage = (product as any).featured_image as string | null | undefined;
      const specifications = (product as any).specifications;
      const resolvedImage = resolveProductImage(featuredImage, dbImages, product.id as number, specifications);

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
    
  } catch (error) {
    console.error('Error in fetchGroupedProducts:', error);
  }
  
  return groupedProducts;
};


// -------------------------------
const defaultProductImage = "/static/images/products/product_1001.jpg";
const defaultCategoryImage = "/uploads/categories/category_1001.jpg";
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
    // Use relative URL so nginx can proxy it
    if (url.startsWith('/uploads/')) {
        // URL-encode the path segments to handle special characters like & in category names
        // The server (express.static) will automatically decode them when serving files
        const parts = url.split('/');
        const encodedParts = parts.map((part, index) => {
            // Don't encode empty strings or the base path segments
            if (!part || index <= 3) return part;
            // Encode category folder names and filenames that may contain special characters
            // This handles existing paths like "home&garden" -> "home%26garden"
            return encodeURIComponent(part);
        });
        return encodedParts.join('/');
    }
    
    return url;
};

// Resolve product image from first value of required specification
export const resolveProductImageFromSpecs = (specifications: any): string | null => {
    if (!specifications) return null;
    
    try {
        // Parse specifications if it's a string
        let spec = specifications;
        if (typeof specifications === 'string') {
            spec = JSON.parse(specifications);
        }
        
        // Check if it has the new format with items and specImages
        if (spec.items && Array.isArray(spec.items) && spec.items.length > 0) {
            const firstItem = spec.items[0]; // Required specification
            const specImages = spec.specImages || {};
            
            // Get images for the first value of the first (required) specification
            if (firstItem.values && firstItem.values.length > 0) {
                const firstValue = firstItem.values[0];
                const valueName = typeof firstValue === 'string' ? firstValue : firstValue.name;
                
                if (valueName && specImages[firstItem.name] && specImages[firstItem.name][valueName]) {
                    const valueImages = specImages[firstItem.name][valueName];
                    if (Array.isArray(valueImages) && valueImages.length > 0) {
                        const firstSpecImage = valueImages[0];
                        if (firstSpecImage && isValidImageUrl(firstSpecImage)) {
                            return normalizeImageUrl(firstSpecImage);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.warn('Error parsing specifications for image:', error);
    }
    
    return null;
};

// Resolve product image with proper fallback logic
export const resolveProductImage = (featuredImage: string | null | undefined, images: unknown[] | undefined, productId: number, specifications?: any): string => {
    // Debug logging
    console.log('resolveProductImage called with:', {
        featuredImage,
        images,
        productId,
        hasSpecifications: !!specifications
    });
    
    // First try to get image from first value of required specification
    if (specifications) {
        const specImage = resolveProductImageFromSpecs(specifications);
        if (specImage) {
            console.log('Using spec image from first value:', specImage);
            return specImage;
        }
    }
    
    // Then try featured_image if it's valid
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