"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PriceDisplay from "@/components/PriceDisplay";
import {
  Heart,
  Star,
  Plus,
  Minus,
  Share,
  Truck,
  Shield,
  RotateCcw,
  ZoomIn,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { resolveProductImage, normalizeImageUrl } from "@/lib/utils";
import ProductVariantSelector, { ProductVariant } from "@/components/ProductVariantSelector";
import ProductSpecificationSelector, { SelectedSpecifications } from "@/components/ProductSpecificationSelector";

interface ProductQuickViewProps {
  product: {
    id: number;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    category: string;
  };
  children: React.ReactNode;
}

interface ProductDetails {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description?: string;
  features?: string[];
  images?: string[];
  rating?: number;
  reviews?: Array<{ user: string; comment: string; rating: number }>;
  inStock?: boolean;
  stockCount?: number;
  specifications?: {
    items?: Array<{
      name: string;
      values: Array<{
        name: string;
        priceChange?: number;
        originalPriceChange?: number;
      }>;
    }>;
    specImages?: Record<string, Record<string, string[]>>;
  };
  specImages?: Record<string, Record<string, string[]>>;
  attributes?: Record<string, any>;
}

export default function ProductQuickView({ product, children }: ProductQuickViewProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);

  // State for additional product details
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [images, setImages] = useState<string[]>([product.image]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>({});
  const [selectedSpecs, setSelectedSpecs] = useState<SelectedSpecifications>({});
  const [calculatedPrice, setCalculatedPrice] = useState(product.price);
  const [calculatedOriginalPrice, setCalculatedOriginalPrice] = useState(product.originalPrice);

  // Only fetch details when modal is opened and hasn't been fetched before
  useEffect(() => {
    if (isOpen) {
      const fetchDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products/${product.id}`);
          if (!res.ok) throw new Error('Failed to fetch product details');
          const data = await res.json();
          setDetails(data.product);
          const rawImages = data.product.images;
          const featuredImage = data.product.featured_image;
          
          // Use the same resolution logic as other components
          const primaryImage = resolveProductImage(featuredImage, rawImages, product.id);
          
          // Normalize all images for the gallery
          const normalized: string[] = Array.isArray(rawImages)
            ? rawImages.map((img: unknown) => {
                if (typeof img === 'string') return normalizeImageUrl(img);
                if (img && typeof img === 'object') {
                  const anyImg = img as Record<string, unknown>;
                  const url = (anyImg.image || anyImg.url || anyImg.src) as string | undefined;
                  if (url && url.trim().length > 0) return normalizeImageUrl(url);
                }
                return '';
              }).filter((u: string) => u && u.trim().length > 0)
            : [];
          
          // Use primary image first, then other images
          const allImages = [primaryImage, ...normalized.filter(img => img !== primaryImage)];
          setImages(allImages.length > 0 ? allImages : [product.image]);
          
          // Initialize selected specifications with first value of each item
          if (data.product.specifications?.items && data.product.specifications.items.length > 0) {
            const initialSpecs: SelectedSpecifications = {};
            data.product.specifications.items.forEach((item: any) => {
              if (item.values && item.values.length > 0) {
                initialSpecs[item.name] = item.values[0].name;
              }
            });
            setSelectedSpecs(initialSpecs);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error("Failed to fetch product details:", error.message);
          }
          setDetails(null);
          setImages([product.image]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [isOpen, product.id, product.image]);
  
  // Update images when first specification changes
  useEffect(() => {
    if (details?.specifications?.items && details.specifications.items.length > 0) {
      const firstItem = details.specifications.items[0];
      const selectedValue = selectedSpecs[firstItem.name];
      const specImages = details.specImages || details.specifications.specImages || {};
      
      if (selectedValue && specImages[firstItem.name] && specImages[firstItem.name][selectedValue]) {
        const valueImages = specImages[firstItem.name][selectedValue];
        if (valueImages.length > 0) {
          setImages(valueImages.map((img: string) => normalizeImageUrl(img)));
          return;
        }
      }
    }
    
    // Fallback to default images
    if (details?.images && details.images.length > 0) {
      const normalized = details.images.map((img: string) => normalizeImageUrl(img));
      setImages(normalized);
    } else {
      setImages([product.image]);
    }
  }, [selectedSpecs, details, product.image]);
  
  // Calculate price based on selected specifications
  useEffect(() => {
    if (!details?.specifications?.items) {
      setCalculatedPrice(product.price);
      setCalculatedOriginalPrice(product.originalPrice);
      return;
    }
    
    let priceChange = 0;
    let originalPriceChange = 0;
    
    details.specifications.items.forEach((item) => {
      const selectedValue = selectedSpecs[item.name];
      if (selectedValue) {
        const value = item.values.find(v => v.name === selectedValue);
        if (value) {
          priceChange += value.priceChange || 0;
          originalPriceChange += value.originalPriceChange || 0;
        }
      }
    });
    
    setCalculatedPrice(product.price + priceChange);
    if (product.originalPrice !== undefined) {
      setCalculatedOriginalPrice(product.originalPrice + originalPriceChange);
    }
  }, [selectedSpecs, details, product.price, product.originalPrice]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
  };

  const handleAddToCart = () => {
    // Build product name with variant and spec info
    const variantString = Object.keys(selectedVariant).length > 0
      ? ` (${Object.entries(selectedVariant).map(([key, value]) => `${key}: ${value}`).join(', ')})`
      : '';
    const specString = Object.keys(selectedSpecs).length > 0
      ? ` (${Object.entries(selectedSpecs).map(([key, value]) => `${key}: ${value}`).join(', ')})`
      : '';
    const productNameWithOptions = `${product.name}${variantString}${specString}`;

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: productNameWithOptions,
        price: calculatedPrice,
        originalPrice: calculatedOriginalPrice,
        image: images[0] || product.image,
        category: product.category,
        variant: selectedVariant
      });
    }
  };

  const discountPercentage = calculatedOriginalPrice && calculatedOriginalPrice > calculatedPrice
    ? Math.round(((calculatedOriginalPrice - calculatedPrice) / calculatedOriginalPrice) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-white max-w-6xl w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="bg-white px-5 py-2">Product Quick View</DialogTitle>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading product details...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="relative bg-gray-50 p-6">
              <div className="space-y-4">
                {/* Main Image */}
                <div
                  className="relative aspect-square overflow-hidden rounded-lg bg-white cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                >
                  <img
                    src={images[selectedImage] || product.image}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-200 ${
                      isZoomed ? 'scale-150' : 'scale-100'
                    }`}
                    style={
                      isZoomed
                        ? {
                            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                          }
                        : {}
                    }
                  />
                  {isZoomed && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full">
                      <ZoomIn className="h-4 w-4" />
                    </div>
                  )}

                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                        onClick={() => setSelectedImage(selectedImage > 0 ? selectedImage - 1 : images.length - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                        onClick={() => setSelectedImage(selectedImage < images.length - 1 ? selectedImage + 1 : 0)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Images */}
                <div className="flex space-x-2 overflow-x-auto">
                  {images.map((image: string, index: number) => (
                    <button
                      key={index}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-black' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Details Section */}
            <div className="p-6 space-y-6 bg-white">
              {/* Header */}
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">
                  {product.category}
                </Badge>
                <h1 className="text-2xl font-bold text-gray-900">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(details?.rating ?? 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {details?.rating ?? 0} ({details?.reviews?.length ?? 0} reviews)
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <PriceDisplay price={calculatedPrice} className="text-3xl font-bold text-gray-900" />
                  {calculatedOriginalPrice && calculatedOriginalPrice > calculatedPrice && (
                    <>
                      <PriceDisplay price={calculatedOriginalPrice} className="text-lg text-gray-500 line-through" />
                      <Badge className="bg-red-500">
                        {discountPercentage}% OFF
                      </Badge>
                    </>
                  )}
                </div>
                {details?.inStock ? (
                  <p className="text-green-600 text-sm font-medium">
                    ✓ In Stock ({details?.stockCount ?? 0} available)
                  </p>
                ) : (
                  <p className="text-red-600 text-sm font-medium">
                    Out of Stock
                  </p>
                )}
              </div>

              <Separator />

              {/* Specification Selector */}
              {details?.specifications?.items && details.specifications.items.length > 0 && (
                <ProductSpecificationSelector
                  specifications={details.specifications}
                  selectedSpecs={selectedSpecs}
                  onSpecChange={setSelectedSpecs}
                  basePrice={product.price}
                  baseOriginalPrice={product.originalPrice}
                />
              )}

              <Separator />

              {/* Variant Selector */}
              {details?.attributes && Object.keys(details.attributes).length > 0 && (
                <ProductVariantSelector
                  attributes={details.attributes}
                  selectedVariant={selectedVariant}
                  onVariantChange={setSelectedVariant}
                />
              )}

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <button
                      className="p-2 hover:bg-gray-100"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 border-x">{quantity}</span>
                    <button
                      className="p-2 hover:bg-gray-100"
                      onClick={() => setQuantity(Math.min(details?.stockCount ?? 1, quantity + 1))}
                      disabled={quantity >= (details?.stockCount ?? 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-gray-50 hover:bg-gray-800"
                    onClick={handleAddToCart}
                    disabled={!details?.inStock}
                  >
                    Add to Cart - ${(calculatedPrice * quantity).toFixed(2)}
                  </Button>
                  <Button variant="outline" size="icon">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Product Info Tabs */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="specs">Specifications</TabsTrigger>
                  <TabsTrigger value="shipping">Shipping</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {details?.description ?? ''}
                    </p>
                  </div>
                  {details?.features && (
                    <div>
                      <h3 className="font-semibold mb-2">Key Features</h3>
                      <ul className="space-y-1">
                        {details.features.map((feature: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="specs" className="space-y-2">
                  {Object.entries(details?.specifications ?? {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-600">{key}:</span>
                      <span className="text-sm text-gray-900">{value as string}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="shipping" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">Free Shipping</p>
                        <p className="text-xs text-gray-600">Delivered in 3-5 business days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">30-Day Returns</p>
                        <p className="text-xs text-gray-600">Easy returns and exchanges</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-sm">Secure Payment</p>
                        <p className="text-xs text-gray-600">256-bit SSL encryption</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Trust Indicators */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Badge variant="outline" className="text-xs">Alipay</Badge>
                  <Badge variant="outline" className="text-xs">WeChat Pay</Badge>
                  <Badge variant="outline" className="text-xs">PayPal</Badge>
                  <Badge variant="outline" className="text-xs">Cards</Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
