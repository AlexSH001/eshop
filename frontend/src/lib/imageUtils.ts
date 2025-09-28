const defaultProductImage = "/static/images/products/product_1001.jpg";
const defaultCategoryImage = "/static/images/categories/category_1001.jpg";
const defaultBannerImage = "/static/images/banners/banner_1.jpg";
const defaultImage = "/static/images/default.jpg";

// Image URL function - handles both local and remote URLs
export const getImagePath = (type: string, id: number): string => {
    if (type === 'products' || type === 'product') {
        if (id) {
            return `/static/images/products/product_${id}.jpg`;
        } else {
            return defaultProductImage;
        }
    } else if (type === 'categories' || type === 'category') {
        if (id) {
            return `/static/images/categories/category_${id}.jpg`;
        } else {
            return defaultCategoryImage;
        }
    } else if (type === 'banners' || type === 'banner') {
        if (id) {
            return `/static/images/banners/banner_${id}.jpg`;
        } else {
            return defaultBannerImage;
        }
    }
    // Default fallback
    return defaultImage;
};

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