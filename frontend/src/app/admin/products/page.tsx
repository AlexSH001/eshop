'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign
} from "lucide-react";
import { resolveProductImage, normalizeImageUrl } from "@/lib/utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";
// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  stock: number;
  description: string;
  image: string;
  status: 'active' | 'inactive';
  createdAt: string;
  sales: number;
  specifications?: Record<string, string>;
  shipping?: string;
}

type ProductFormData = {
  name: string;
  price: string;
  originalPrice: string;
  categoryId: string;
  stock: string;
  description: string;
  image: string;
  status: string;
  specifications: Array<{ key: string; value: string }>;
  shipping: string;
  images: string[]; // Multiple images
  featuredImage: string; // Featured image URL
};

// Helper to robustly parse specifications
function parseSpecifications(spec: any) {
  if (!spec) return [{ key: '', value: '' }];
  if (typeof spec === 'string') {
    try {
      spec = JSON.parse(spec);
    } catch {
      return [{ key: '', value: '' }];
    }
  }
  if (typeof spec === 'object' && !Array.isArray(spec)) {
    return Object.entries(spec).map(([key, value]) => ({ key, value: String(value) }));
  }
  return [{ key: '', value: '' }];
}

export default function AdminProductsPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Add state for categories
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(data.categories.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })));
      } catch (err) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Update formData to use categoryId instead of category name
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    originalPrice: "",
    categoryId: "",
    stock: "",
    description: "",
    image: "",
    status: "active",
    specifications: [{ key: '', value: '' }],
    shipping: "",
    images: [],
    featuredImage: ""
  });
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Helper function to get category ID by name
  const getCategoryIdByName = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.id.toString() : '';
  };

  // Image upload functions
  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true);
    try {
      const uploadFormData = new FormData();
      Array.from(files).forEach(file => {
        uploadFormData.append('images', file);
      });

      // Add categoryId and productName to form data
      console.log('Form data:', { categoryId: formData.categoryId, name: formData.name });
      
      if (formData.categoryId) {
        uploadFormData.append('categoryId', formData.categoryId);
        console.log('Added categoryId to form:', formData.categoryId);
      } else {
        toast.error('Please select a category before uploading images');
        setUploadingImages(false);
        return;
      }
      if (formData.name) {
        uploadFormData.append('productName', formData.name);
        console.log('Added productName to form:', formData.name);
      } else {
        toast.error('Please enter a product name before uploading images');
        setUploadingImages(false);
        return;
      }

      console.log('Uploading images...', Array.from(files).map(f => f.name));

      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('Admin authentication required. Please login again.');
      }

      const res = await fetch('http://localhost:3001/api/upload/product-images', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          // Don't set Content-Type, let browser set it with boundary for FormData
        },
        body: uploadFormData
      });

      console.log('Upload response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Upload error response:', errorData);
        throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await res.json();
      console.log('Upload success:', data);
      
      const newImageUrls = data.files.map((file: any) => file.url);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImageUrls],
        featuredImage: prev.featuredImage || newImageUrls[0] // Set first as featured if none selected
      }));
      
      toast.success(`${data.files.length} images uploaded successfully`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload images: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = async (imageUrl: string) => {
    try {
      // Call backend to delete the image file
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('Admin authentication required. Please login again.');
      }

      const res = await fetch('http://localhost:3001/api/upload/product-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        credentials: 'include',
        body: JSON.stringify({ imageUrl })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to delete image: ${errorData.error || 'Unknown error'}`);
      }

      // Update form data to remove the image
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(img => img !== imageUrl),
        featuredImage: prev.featuredImage === imageUrl ? '' : prev.featuredImage
      }));

      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const setFeaturedImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      featuredImage: imageUrl
    }));
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:3001/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        const mappedProducts: Product[] = data.products.map((p: Record<string, unknown>) => {
          const images = p.images as unknown;
          const featuredImage = (p as any).featured_image as string | null | undefined;
          const dbImages = Array.isArray(images) ? images : undefined;
          const resolvedImage = resolveProductImage(featuredImage, dbImages, p.id as number);

          return {
            id: p.id as number,
            name: p.name as string,
            price: p.price as number,
            originalPrice: p.original_price as number | undefined,
            category: (p.category_name as string) || '',
            stock: p.stock as number,
            description: p.description as string,
            image: resolvedImage,
            status: p.status as 'active' | 'inactive',
            createdAt: p.created_at as string,
            sales: (p.sales_count as number) || 0,
            specifications: p.specifications as Record<string, string> | undefined,
            shipping: p.shipping as string | undefined
          };
        });
        setProducts(mappedProducts);
      } catch (err) {
        setError((err as Error).message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
          categoryId: formData.categoryId,
          stock: parseInt(formData.stock),
          status: formData.status,
          featuredImage: formData.featuredImage,
          images: formData.images,
          specifications: Object.fromEntries(formData.specifications.filter(s => s.key).map(s => [s.key, s.value])),
          shipping: formData.shipping
        })
      });
      if (!res.ok) throw new Error('Failed to add product');
      const { product } = await res.json();
      setProducts(prev => [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.original_price,
          category: categories.find(cat => cat.id === Number(formData.categoryId))?.name || '',
          stock: product.stock,
          description: product.description,
          image: resolveProductImage(product.featured_image, product.images, product.id),
          status: product.status,
          createdAt: product.created_at,
          sales: product.sales_count || 0,
          specifications: product.specifications,
          shipping: product.shipping
        },
        ...prev
      ]);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        price: "",
        originalPrice: "",
        categoryId: "",
        stock: "",
        description: "",
        image: "",
        status: "active",
        specifications: [{ key: '', value: '' }],
        shipping: "",
        images: [],
        featuredImage: ""
      });
      toast.success('Product added successfully');
    } catch (err) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
          categoryId: formData.categoryId,
          stock: parseInt(formData.stock),
          status: formData.status,
          featured_image: formData.featuredImage, // Use snake_case for backend
          images: formData.images,
          specifications: Object.fromEntries(formData.specifications.filter(s => s.key).map(s => [s.key, s.value])),
          shipping: formData.shipping
        })
      });
      if (!res.ok) throw new Error('Failed to update product');
      const { product } = await res.json();
      
      // Debug: Log the updated product data
      console.log('Updated product from API:', {
        featured_image: product.featured_image,
        images: product.images,
        id: product.id
      });
      
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? {
              id: product.id,
              name: product.name,
              price: product.price,
              originalPrice: product.original_price,
              // Use categories state to get the category name by categoryId
              category: categories.find(cat => cat.id === Number(formData.categoryId))?.name || '',
              stock: product.stock,
              description: product.description,
              image: resolveProductImage(product.featured_image, product.images, product.id),
              status: product.status,
              createdAt: product.created_at,
              sales: product.sales_count || 0,
              specifications: product.specifications,
              shipping: product.shipping
            }
          : p
      ));
      setEditingProduct(null);
      setFormData({
        name: "",
        price: "",
        originalPrice: "",
        categoryId: "",
        stock: "",
        description: "",
        image: "",
        status: "active",
        specifications: [{ key: '', value: '' }],
        shipping: "",
        images: [],
        featuredImage: ""
      });
      toast.success('Product updated successfully');
    } catch (err) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
      setDeletingProduct(null);
      toast.success('Product deleted successfully');
    } catch (err) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Products Management</h1>
        <p className="text-gray-600 mb-8">Manage your product catalog</p>

        <div className="flex justify-between items-center mb-4">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-1/3"
          />
          <Button onClick={() => {
            // Reset form data when opening add modal
            setFormData({
              name: "",
              price: "",
              originalPrice: "",
              categoryId: "",
              stock: "",
              description: "",
              image: "",
              status: "active",
              specifications: [{ key: '', value: '' }],
              shipping: "",
              images: [],
              featuredImage: ""
            });
            setIsAddModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr>
                <th className="px-4 py-2">Image</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-2">
                    {product.image && (
                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded object-cover" />
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">{product.name}</td>
                  <td className="px-4 py-2">{product.category}</td>
                  <td className="px-4 py-2">${product.price}</td>
                  <td className="px-4 py-2">{product.stock}</td>
                  <td className="px-4 py-2">
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      setEditingProduct(product);
                      
                      // Fetch full product details including images
                      try {
                        const res = await fetch(`http://localhost:3001/api/products/${product.id}`, {
                          credentials: 'include'
                        });
                        if (res.ok) {
                          const { product: fullProduct } = await res.json();
                          setFormData({
                            name: fullProduct.name,
                            price: fullProduct.price.toString(),
                            originalPrice: fullProduct.original_price?.toString() || '',
                            categoryId: fullProduct.category_id?.toString() || getCategoryIdByName(product.category),
                            stock: fullProduct.stock.toString(),
                            description: fullProduct.description,
                            image: product.image,
                            status: fullProduct.status,
                            specifications: parseSpecifications(fullProduct.specifications),
                            shipping: fullProduct.shipping || '',
                            images: fullProduct.images || [],
                            featuredImage: fullProduct.featured_image || ''
                          });
                        } else {
                          // Fallback to basic product data
                          setFormData({
                            name: product.name,
                            price: product.price.toString(),
                            originalPrice: product.originalPrice?.toString() || '',
                            categoryId: getCategoryIdByName(product.category),
                            stock: product.stock.toString(),
                            description: product.description,
                            image: product.image,
                            status: product.status,
                            specifications: parseSpecifications(product.specifications),
                            shipping: product.shipping || '',
                            images: [],
                            featuredImage: product.image
                          });
                        }
                      } catch (error) {
                        console.error('Error fetching product details:', error);
                        // Fallback to basic product data
                        setFormData({
                          name: product.name,
                          price: product.price.toString(),
                          originalPrice: product.originalPrice?.toString() || '',
                          categoryId: getCategoryIdByName(product.category),
                          stock: product.stock.toString(),
                          description: product.description,
                          image: product.image,
                          status: product.status,
                          specifications: parseSpecifications(product.specifications),
                          shipping: product.shipping || '',
                          images: [],
                          featuredImage: product.image
                        });
                      }
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="ml-2 text-red-600" onClick={() => setDeletingProduct(product)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Product Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            // Reset form data when closing modal
            setFormData({
              name: "",
              price: "",
              originalPrice: "",
              categoryId: "",
              stock: "",
              description: "",
              image: "",
              status: "active",
              specifications: [{ key: '', value: '' }],
              shipping: "",
              images: [],
              featuredImage: ""
            });
          }
        }}>
          <DialogContent className="max-w-md bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAddProduct();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="originalPrice">Original Price</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <Select value={formData.categoryId} onValueChange={value => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Product Images</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        handleImageUpload(files);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImages}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {uploadingImages ? 'Uploading...' : 'Click to upload images or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
                    </label>
                  </div>
                </div>

                {/* Image Preview Grid */}
                {formData.images.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Images</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={normalizeImageUrl(imageUrl)}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setFeaturedImage(imageUrl);
                                }}
                                className={`h-8 w-8 p-0 ${
                                  formData.featuredImage === imageUrl 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white text-gray-700'
                                }`}
                                title={formData.featuredImage === imageUrl ? 'Featured Image' : 'Set as Featured'}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImage(imageUrl);
                                }}
                                className="h-8 w-8 p-0"
                                title="Remove Image"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {formData.featuredImage === imageUrl && (
                            <div className="absolute top-1 left-1">
                              <Badge className="bg-blue-500 text-white text-xs">Featured</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value as 'active' | 'inactive' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Specifications</Label>
                {formData.specifications.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Key"
                      value={spec.key}
                      onChange={e => {
                        const newSpecs = [...formData.specifications];
                        newSpecs[idx].key = e.target.value;
                        setFormData({ ...formData, specifications: newSpecs });
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={spec.value}
                      onChange={e => {
                        const newSpecs = [...formData.specifications];
                        newSpecs[idx].value = e.target.value;
                        setFormData({ ...formData, specifications: newSpecs });
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => {
                      setFormData({ ...formData, specifications: formData.specifications.filter((_, i) => i !== idx) });
                    }}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setFormData({ ...formData, specifications: [...formData.specifications, { key: '', value: '' }] })}>
                  Add Specification
                </Button>
              </div>
              <div>
                <Label htmlFor="shipping">Shipping Info</Label>
                <Textarea
                  id="shipping"
                  value={formData.shipping}
                  onChange={e => setFormData({ ...formData, shipping: e.target.value })}
                  placeholder="Enter shipping details..."
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600">
                Add Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-md bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleEditProduct();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="originalPrice">Original Price</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <Select value={formData.categoryId} onValueChange={value => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Product Images</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        handleImageUpload(files);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImages}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {uploadingImages ? 'Uploading...' : 'Click to upload images or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
                    </label>
                  </div>
                </div>

                {/* Image Preview Grid */}
                {formData.images.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Images</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={normalizeImageUrl(imageUrl)}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setFeaturedImage(imageUrl);
                                }}
                                className={`h-8 w-8 p-0 ${
                                  formData.featuredImage === imageUrl 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white text-gray-700'
                                }`}
                                title={formData.featuredImage === imageUrl ? 'Featured Image' : 'Set as Featured'}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImage(imageUrl);
                                }}
                                className="h-8 w-8 p-0"
                                title="Remove Image"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {formData.featuredImage === imageUrl && (
                            <div className="absolute top-1 left-1">
                              <Badge className="bg-blue-500 text-white text-xs">Featured</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value as 'active' | 'inactive' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Specifications</Label>
                {formData.specifications.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Key"
                      value={spec.key}
                      onChange={e => {
                        const newSpecs = [...formData.specifications];
                        newSpecs[idx].key = e.target.value;
                        setFormData({ ...formData, specifications: newSpecs });
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={spec.value}
                      onChange={e => {
                        const newSpecs = [...formData.specifications];
                        newSpecs[idx].value = e.target.value;
                        setFormData({ ...formData, specifications: newSpecs });
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => {
                      setFormData({ ...formData, specifications: formData.specifications.filter((_, i) => i !== idx) });
                    }}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setFormData({ ...formData, specifications: [...formData.specifications, { key: '', value: '' }] })}>
                  Add Specification
                </Button>
              </div>
              <div>
                <Label htmlFor="shipping">Shipping Info</Label>
                <Textarea
                  id="shipping"
                  value={formData.shipping}
                  onChange={e => setFormData({ ...formData, shipping: e.target.value })}
                  placeholder="Enter shipping details..."
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600">
                Update Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Product Modal */}
        <Dialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <div className="mb-4">Are you sure you want to delete <span className="font-bold">{deletingProduct?.name}</span>?</div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeletingProduct(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteProduct}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
