"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronRight
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

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

export default function ProductQuickView({ product, children }: ProductQuickViewProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  // Initialize random values once when component mounts
  const [productStats] = useState(() => ({
    reviews: Math.floor(Math.random() * 500) + 50,
    stockCount: Math.floor(Math.random() * 50) + 10
  }));

  // Mock additional data for demo purposes
  const productImages = [
    product.image,
    product.image.replace('?w=300&h=300', '?w=300&h=300&sig=1'),
    product.image.replace('?w=300&h=300', '?w=300&h=300&sig=2'),
    product.image.replace('?w=300&h=300', '?w=300&h=300&sig=3')
  ];

  const productDetails = {
    description: `Premium quality ${product.name.toLowerCase()} designed for modern lifestyle. Features advanced technology and superior materials for exceptional performance and durability.`,
    specifications: {
      "Brand": "Premium Brand",
      "Model": product.name,
      "Category": product.category,
      "Warranty": "2 Years",
      "Shipping": "Free Shipping",
      "Return Policy": "30 Days"
    },
    features: [
      "Premium materials and construction",
      "Advanced technology integration",
      "Ergonomic design for comfort",
      "Environmentally friendly",
      "Easy maintenance and care"
    ],
    rating: 4.5,
    reviews: productStats.reviews,
    inStock: true,
    stockCount: productStats.stockCount
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category
      });
    }
  };

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto p-0">
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
                  src={productImages[selectedImage]}
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
                {productImages.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                      onClick={() => setSelectedImage(selectedImage > 0 ? selectedImage - 1 : productImages.length - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                      onClick={() => setSelectedImage(selectedImage < productImages.length - 1 ? selectedImage + 1 : 0)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Images */}
              <div className="flex space-x-2 overflow-x-auto">
                {productImages.map((image, index) => (
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
          <div className="p-6 space-y-6">
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
                        i < Math.floor(productDetails.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {productDetails.rating} ({productDetails.reviews} reviews)
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  ${product.price}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      ${product.originalPrice}
                    </span>
                    <Badge className="bg-red-500">
                      {discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>
              {productDetails.inStock ? (
                <p className="text-green-600 text-sm font-medium">
                  ✓ In Stock ({productDetails.stockCount} available)
                </p>
              ) : (
                <p className="text-red-600 text-sm font-medium">
                  Out of Stock
                </p>
              )}
            </div>

            <Separator />

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
                    onClick={() => setQuantity(Math.min(productDetails.stockCount, quantity + 1))}
                    disabled={quantity >= productDetails.stockCount}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-black hover:bg-gray-800"
                  onClick={handleAddToCart}
                  disabled={!productDetails.inStock}
                >
                  Add to Cart - ${(product.price * quantity).toFixed(2)}
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
                    {productDetails.description}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Key Features</h3>
                  <ul className="space-y-1">
                    {productDetails.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="specs" className="space-y-2">
                {Object.entries(productDetails.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-600">{key}:</span>
                    <span className="text-sm text-gray-900">{value}</span>
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
      </DialogContent>
    </Dialog>
  );
}
