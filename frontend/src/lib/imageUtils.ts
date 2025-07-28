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
