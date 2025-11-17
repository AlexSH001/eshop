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

type PrimarySpecValue = {
  name: string;
  priceChange: number;
  images: string[];
};

type AdditionalSpecItem = {
  name: string;
  values: Array<{
    name: string;
    priceChange: number;
  }>;
};

type ProductFormData = {
  name: string;
  price: string;
  categoryId: string;
  stock: string;
  description: string;
  status: string;
  primarySpecification: {
    name: string; // Defaults to product name, editable
    values: PrimarySpecValue[];
  };
  additionalSpecifications: AdditionalSpecItem[];
  shipping: string;
};

// Helper to parse specifications from backend
function parseSpecifications(spec: any, productName: string = '') {
  if (!spec) {
    return {
      primarySpecification: {
        name: productName,
        values: [{ name: '', priceChange: 0, images: [] }]
      },
      additionalSpecifications: []
    };
  }
  
  if (typeof spec === 'string') {
    try {
      spec = JSON.parse(spec);
    } catch {
      return {
        primarySpecification: {
          name: productName,
          values: [{ name: '', priceChange: 0, images: [] }]
        },
        additionalSpecifications: []
      };
    }
  }
  
  // Check if it's the new format with items array
  if (spec.items && Array.isArray(spec.items) && spec.items.length > 0) {
    const primarySpec = spec.items[0];
    const specImages = spec.specImages || {};
    const primaryImages = specImages[primarySpec.name] || {};
    
    return {
      primarySpecification: {
        name: primarySpec.name || productName,
        values: (primarySpec.values || []).map((v: any) => ({
          name: typeof v === 'string' ? v : (v.name || ''),
          priceChange: typeof v === 'object' ? (v.priceChange || 0) : 0,
          images: primaryImages[typeof v === 'string' ? v : (v.name || '')] || []
        }))
      },
      additionalSpecifications: spec.items.slice(1).map((item: any) => ({
        name: item.name || '',
        values: (item.values || []).map((v: any) => ({
          name: typeof v === 'string' ? v : (v.name || ''),
          priceChange: typeof v === 'object' ? (v.priceChange || 0) : 0
        }))
      }))
    };
  }
  
  // Legacy format - convert to new format
  return {
    primarySpecification: {
      name: productName,
      values: [{ name: '', priceChange: 0, images: [] }]
    },
    additionalSpecifications: []
  };
}

export default function AdminProductsPage() {
  const { isAuthenticated, isLoading, refreshToken, user } = useAdmin();
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/categories`);
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
    categoryId: "",
    stock: "",
    description: "",
    status: "active",
    primarySpecification: {
      name: "",
      values: [{ name: '', priceChange: 0, images: [] }]
    },
    additionalSpecifications: [],
    shipping: ""
  });
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingForValue, setUploadingForValue] = useState<{ valueIndex: number } | null>(null);
  
  // Sync primary specification name with product name
  useEffect(() => {
    if (formData.primarySpecification.name !== formData.name) {
      setFormData(prev => ({
        ...prev,
        primarySpecification: {
          ...prev.primarySpecification,
          name: prev.name
        }
      }));
    }
  }, [formData.name]);

  // Helper function to make authenticated API calls with automatic token refresh
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const adminToken = localStorage.getItem('admin_token');
    console.log('Making authenticated request to:', url);
    console.log('Current token exists:', !!adminToken);
    
    if (!adminToken) {
      throw new Error('Admin authentication required. Please login again.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    console.log('Response status:', response.status);

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      const refreshed = await refreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem('admin_token');
        console.log('Token refreshed, retrying request...');
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
          },
        });
      } else {
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  };

  // Helper function to get category ID by name
  const getCategoryIdByName = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.id.toString() : '';
  };

  // Image upload function for primary specification values
  const handleImageUpload = async (files: FileList, valueIndex: number) => {
    if (!formData.primarySpecification.values[valueIndex]?.name) {
      toast.error('Please enter a value name before uploading images');
      return;
    }
    
    setUploadingImages(true);
    setUploadingForValue({ valueIndex });
    try {
      const uploadFormData = new FormData();
      Array.from(files).forEach(file => {
        uploadFormData.append('images', file);
      });

      if (!formData.categoryId) {
        toast.error('Please select a category before uploading images');
        setUploadingImages(false);
        setUploadingForValue(null);
        return;
      }
      if (!formData.name) {
        toast.error('Please enter a product name before uploading images');
        setUploadingImages(false);
        setUploadingForValue(null);
        return;
      }

      uploadFormData.append('categoryId', formData.categoryId);
      uploadFormData.append('productName', formData.name);
      uploadFormData.append('specItemName', formData.primarySpecification.name);
      uploadFormData.append('specValue', formData.primarySpecification.values[valueIndex].name);

      const res = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/product-images`, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await res.json();
      const newImageUrls = data.files.map((file: any) => file.url);
      
      setFormData(prev => {
        const newValues = [...prev.primarySpecification.values];
        newValues[valueIndex] = {
          ...newValues[valueIndex],
          images: [...newValues[valueIndex].images, ...newImageUrls]
        };
        return {
          ...prev,
          primarySpecification: {
            ...prev.primarySpecification,
            values: newValues
          }
        };
      });
      
      toast.success(`${data.files.length} images uploaded successfully`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload images: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadingImages(false);
      setUploadingForValue(null);
    }
  };

  const removeImage = async (imageUrl: string, valueIndex: number) => {
    try {
      const res = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/product-image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ imageUrl })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to delete image: ${errorData.error || 'Unknown error'}`);
      }

      setFormData(prev => {
        const newValues = [...prev.primarySpecification.values];
        newValues[valueIndex] = {
          ...newValues[valueIndex],
          images: newValues[valueIndex].images.filter(img => img !== imageUrl)
        };
        return {
          ...prev,
          primarySpecification: {
            ...prev.primarySpecification,
            values: newValues
          }
        };
      });

      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        // Fetch all products including inactive ones
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products?status=all`);
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        const mappedProducts: Product[] = data.products.map((p: Record<string, unknown>) => {
          const images = p.images as unknown;
          const featuredImage = (p as any).featured_image as string | null | undefined;
          const dbImages = Array.isArray(images) ? images : undefined;
          const specifications = (p as any).specifications;
          const resolvedImage = resolveProductImage(featuredImage, dbImages, p.id as number, specifications);

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
      // Build specifications object
      const specItems = [
        {
          name: formData.primarySpecification.name || formData.name,
          values: formData.primarySpecification.values.map(v => ({
            name: v.name,
            priceChange: v.priceChange || 0
          }))
        },
        ...formData.additionalSpecifications.map(item => ({
          name: item.name,
          values: item.values.map(v => ({
            name: v.name,
            priceChange: v.priceChange || 0
          }))
        }))
      ];
      
      // Build specImages object for primary specification
      const specImages: Record<string, Record<string, string[]>> = {};
      if (formData.primarySpecification.name) {
        specImages[formData.primarySpecification.name] = {};
        formData.primarySpecification.values.forEach(v => {
          if (v.name && v.images.length > 0) {
            specImages[formData.primarySpecification.name][v.name] = v.images;
          }
        });
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId,
          stock: parseInt(formData.stock),
          status: formData.status,
          specifications: {
            items: specItems,
            specImages: specImages
          },
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
          category: categories.find(cat => cat.id === Number(formData.categoryId))?.name || '',
          stock: product.stock,
          description: product.description,
          image: resolveProductImage(product.featured_image, product.images, product.id, product.specifications),
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
        categoryId: "",
        stock: "",
        description: "",
        status: "active",
        primarySpecification: {
          name: "",
          values: [{ name: '', priceChange: 0, images: [] }]
        },
        additionalSpecifications: [],
        shipping: ""
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
      // Build specifications object
      const specItems = [
        {
          name: formData.primarySpecification.name || formData.name,
          values: formData.primarySpecification.values.map(v => ({
            name: v.name,
            priceChange: v.priceChange || 0
          }))
        },
        ...formData.additionalSpecifications.map(item => ({
          name: item.name,
          values: item.values.map(v => ({
            name: v.name,
            priceChange: v.priceChange || 0
          }))
        }))
      ];
      
      // Build specImages object for primary specification
      const specImages: Record<string, Record<string, string[]>> = {};
      if (formData.primarySpecification.name) {
        specImages[formData.primarySpecification.name] = {};
        formData.primarySpecification.values.forEach(v => {
          if (v.name && v.images.length > 0) {
            specImages[formData.primarySpecification.name][v.name] = v.images;
          }
        });
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId,
          stock: parseInt(formData.stock),
          status: formData.status,
          specifications: {
            items: specItems,
            specImages: specImages
          },
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
              category: categories.find(cat => cat.id === Number(formData.categoryId))?.name || '',
              stock: product.stock,
              description: product.description,
              image: resolveProductImage(product.featured_image, product.images, product.id, product.specifications),
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
        categoryId: "",
        stock: "",
        description: "",
        status: "active",
        primarySpecification: {
          name: "",
          values: [{ name: '', priceChange: 0, images: [] }]
        },
        additionalSpecifications: [],
        shipping: ""
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products/${deletingProduct.id}`, {
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

        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex gap-4 flex-1">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => {
            // Reset form data when opening add modal
            setFormData({
              name: "",
              price: "",
              categoryId: "",
              stock: "",
              description: "",
              status: "active",
              primarySpecification: {
                name: "",
                values: [{ name: '', priceChange: 0, images: [] }]
              },
              additionalSpecifications: [],
              shipping: ""
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
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/products/${product.id}`, {
                          credentials: 'include'
                        });
                        if (res.ok) {
                          const { product: fullProduct } = await res.json();
                          const parsedSpecs = parseSpecifications(fullProduct.specifications, fullProduct.name);
                          setFormData({
                            name: fullProduct.name,
                            price: fullProduct.price.toString(),
                            categoryId: fullProduct.category_id?.toString() || getCategoryIdByName(product.category),
                            stock: fullProduct.stock.toString(),
                            description: fullProduct.description,
                            status: fullProduct.status,
                            primarySpecification: parsedSpecs.primarySpecification,
                            additionalSpecifications: parsedSpecs.additionalSpecifications,
                            shipping: fullProduct.shipping || ''
                          });
                        } else {
                          // Fallback to basic product data
                          const parsedSpecs = parseSpecifications(product.specifications, product.name);
                          setFormData({
                            name: product.name,
                            price: product.price.toString(),
                            categoryId: getCategoryIdByName(product.category),
                            stock: product.stock.toString(),
                            description: product.description,
                            status: product.status,
                            primarySpecification: parsedSpecs.primarySpecification,
                            additionalSpecifications: parsedSpecs.additionalSpecifications,
                            shipping: product.shipping || ''
                          });
                        }
                      } catch (error) {
                        console.error('Error fetching product details:', error);
                        // Fallback to basic product data
                        const parsedSpecs = parseSpecifications(product.specifications, product.name);
                        setFormData({
                          name: product.name,
                          price: product.price.toString(),
                          categoryId: getCategoryIdByName(product.category),
                          stock: product.stock.toString(),
                          description: product.description,
                          status: product.status,
                          primarySpecification: parsedSpecs.primarySpecification,
                          additionalSpecifications: parsedSpecs.additionalSpecifications,
                          shipping: product.shipping || ''
                        });
                      }
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user?.role === 'super_admin' && (
                      <Button size="sm" variant="outline" className="ml-2 text-red-600" onClick={() => setDeletingProduct(product)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
              categoryId: "",
              stock: "",
              description: "",
              status: "active",
              primarySpecification: {
                name: "",
                values: [{ name: '', priceChange: 0, images: [] }]
              },
              additionalSpecifications: [],
              shipping: ""
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
              
              {/* Primary Specification */}
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <Label className="text-base font-semibold">Specification (Required)</Label>
                <p className="text-xs text-gray-600 mb-2">The first specification item. Each value can have images uploaded.</p>
                
                <div>
                  <Label className="text-sm">Specification Name</Label>
                  <Input
                    placeholder="Product Name (default)"
                    value={formData.primarySpecification.name}
                    onChange={e => setFormData({
                      ...formData,
                      primarySpecification: {
                        ...formData.primarySpecification,
                        name: e.target.value
                      }
                    })}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                    <span>Value</span>
                    <span>Price Change</span>
                  </div>
                  {formData.primarySpecification.values.map((value, valueIdx) => (
                    <div key={valueIdx} className="p-3 bg-white rounded border space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Value name"
                          value={value.name}
                          onChange={e => {
                            const newValues = [...formData.primarySpecification.values];
                            newValues[valueIdx].name = e.target.value;
                            setFormData({
                              ...formData,
                              primarySpecification: {
                                ...formData.primarySpecification,
                                values: newValues
                              }
                            });
                          }}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={value.priceChange || 0}
                          onChange={e => {
                            const newValues = [...formData.primarySpecification.values];
                            newValues[valueIdx].priceChange = parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData,
                              primarySpecification: {
                                ...formData.primarySpecification,
                                values: newValues
                              }
                            });
                          }}
                          className="text-sm"
                        />
                      </div>
                      
                      {/* Image Upload for this value */}
                      <div className="space-y-2">
                        <Label className="text-xs">Images for this value:</Label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleImageUpload(e.target.files, valueIdx);
                            }
                          }}
                          className="hidden"
                          id={`image-upload-add-${valueIdx}`}
                          disabled={uploadingImages && uploadingForValue?.valueIndex === valueIdx}
                        />
                        <label
                          htmlFor={`image-upload-add-${valueIdx}`}
                          className={`flex items-center justify-center border-2 border-dashed rounded p-2 text-sm cursor-pointer ${
                            uploadingImages && uploadingForValue?.valueIndex === valueIdx
                              ? 'opacity-50 cursor-not-allowed border-gray-300'
                              : 'hover:border-blue-500 border-gray-300'
                          }`}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingImages && uploadingForValue?.valueIndex === valueIdx ? 'Uploading...' : 'Upload Images'}
                        </label>
                        
                        {/* Display uploaded images */}
                        {value.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {value.images.map((imgUrl, imgIdx) => (
                              <div key={imgIdx} className="relative group">
                                <img src={normalizeImageUrl(imgUrl)} alt={`${value.name} ${imgIdx + 1}`} className="w-full h-20 object-cover rounded border" />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => removeImage(imgUrl, valueIdx)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {formData.primarySpecification.values.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValues = formData.primarySpecification.values.filter((_, i) => i !== valueIdx);
                            setFormData({
                              ...formData,
                              primarySpecification: {
                                ...formData.primarySpecification,
                                values: newValues
                              }
                            });
                          }}
                        >
                          Remove Value
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        primarySpecification: {
                          ...formData.primarySpecification,
                          values: [...formData.primarySpecification.values, { name: '', priceChange: 0, images: [] }]
                        }
                      });
                    }}
                  >
                    Add Value
                  </Button>
                </div>
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
              {/* Additional Product Specifications */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-base font-semibold">Additional Product Specifications</Label>
                <p className="text-xs text-gray-600 mb-2">Optional specifications that can be added. No image uploads.</p>
                
                {formData.additionalSpecifications.map((item, itemIdx) => (
                  <div key={itemIdx} className="p-3 bg-gray-50 rounded border space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Specification name"
                        value={item.name}
                        onChange={e => {
                          const newSpecs = [...formData.additionalSpecifications];
                          newSpecs[itemIdx].name = e.target.value;
                          setFormData({ ...formData, additionalSpecifications: newSpecs });
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSpecs = formData.additionalSpecifications.filter((_, i) => i !== itemIdx);
                          setFormData({ ...formData, additionalSpecifications: newSpecs });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                        <span>Value</span>
                        <span>Price Change</span>
                      </div>
                      {item.values.map((value, valueIdx) => (
                        <div key={valueIdx} className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Value name"
                            value={value.name}
                            onChange={e => {
                              const newSpecs = [...formData.additionalSpecifications];
                              newSpecs[itemIdx].values[valueIdx].name = e.target.value;
                              setFormData({ ...formData, additionalSpecifications: newSpecs });
                            }}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={value.priceChange || 0}
                              onChange={e => {
                                const newSpecs = [...formData.additionalSpecifications];
                                newSpecs[itemIdx].values[valueIdx].priceChange = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, additionalSpecifications: newSpecs });
                              }}
                              className="text-sm"
                            />
                            {item.values.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newSpecs = [...formData.additionalSpecifications];
                                  newSpecs[itemIdx].values = newSpecs[itemIdx].values.filter((_, i) => i !== valueIdx);
                                  setFormData({ ...formData, additionalSpecifications: newSpecs });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newSpecs = [...formData.additionalSpecifications];
                          newSpecs[itemIdx].values.push({ name: '', priceChange: 0 });
                          setFormData({ ...formData, additionalSpecifications: newSpecs });
                        }}
                      >
                        Add Value
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      additionalSpecifications: [...formData.additionalSpecifications, {
                        name: '',
                        values: [{ name: '', priceChange: 0 }]
                      }]
                    });
                  }}
                >
                  Add Specification Item
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
              
              {/* Primary Specification */}
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <Label className="text-base font-semibold">Specification (Required)</Label>
                <p className="text-xs text-gray-600 mb-2">The first specification item. Each value can have images uploaded.</p>
                
                <div>
                  <Label className="text-sm">Specification Name</Label>
                  <Input
                    placeholder="Product Name (default)"
                    value={formData.primarySpecification.name}
                    onChange={e => setFormData({
                      ...formData,
                      primarySpecification: {
                        ...formData.primarySpecification,
                        name: e.target.value
                      }
                    })}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                    <span>Value</span>
                    <span>Price Change</span>
                  </div>
                  {formData.primarySpecification.values.map((value, valueIdx) => (
                    <div key={valueIdx} className="p-3 bg-white rounded border space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Value name"
                          value={value.name}
                          onChange={e => {
                            const newValues = [...formData.primarySpecification.values];
                            newValues[valueIdx].name = e.target.value;
                            setFormData({
                              ...formData,
                              primarySpecification: {
                                ...formData.primarySpecification,
                                values: newValues
                              }
                            });
                          }}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={value.priceChange || 0}
                          onChange={e => {
                            const newValues = [...formData.primarySpecification.values];
                            newValues[valueIdx].priceChange = parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData,
                              primarySpecification: {
                                ...formData.primarySpecification,
                                values: newValues
                              }
                            });
                          }}
                          className="text-sm"
                        />
                      </div>
                      
                      {/* Image Upload for this value */}
                      <div className="space-y-2">
                        <Label className="text-xs">Images for this value:</Label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleImageUpload(e.target.files, valueIdx);
                            }
                          }}
                          className="hidden"
                          id={`image-upload-edit-${valueIdx}`}
                          disabled={uploadingImages && uploadingForValue?.valueIndex === valueIdx}
                        />
                        <label
                          htmlFor={`image-upload-edit-${valueIdx}`}
                          className={`flex items-center justify-center border-2 border-dashed rounded p-2 text-sm cursor-pointer ${
                            uploadingImages && uploadingForValue?.valueIndex === valueIdx
                              ? 'opacity-50 cursor-not-allowed border-gray-300'
                              : 'hover:border-blue-500 border-gray-300'
                          }`}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingImages && uploadingForValue?.valueIndex === valueIdx ? 'Uploading...' : 'Upload Images'}
                        </label>
                        
                        {/* Display uploaded images */}
                        {value.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {value.images.map((imgUrl, imgIdx) => (
                              <div key={imgIdx} className="relative group">
                                <img src={normalizeImageUrl(imgUrl)} alt={`${value.name} ${imgIdx + 1}`} className="w-full h-20 object-cover rounded border" />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => removeImage(imgUrl, valueIdx)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {formData.primarySpecification.values.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValues = formData.primarySpecification.values.filter((_, i) => i !== valueIdx);
                            setFormData({
                              ...formData,
                              primarySpecification: {
                                ...formData.primarySpecification,
                                values: newValues
                              }
                            });
                          }}
                        >
                          Remove Value
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        primarySpecification: {
                          ...formData.primarySpecification,
                          values: [...formData.primarySpecification.values, { name: '', priceChange: 0, images: [] }]
                        }
                      });
                    }}
                  >
                    Add Value
                  </Button>
                </div>
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
              
              {/* Additional Product Specifications */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-base font-semibold">Additional Product Specifications</Label>
                <p className="text-xs text-gray-600 mb-2">Optional specifications that can be added. No image uploads.</p>
                
                {formData.additionalSpecifications.map((item, itemIdx) => (
                  <div key={itemIdx} className="p-3 bg-gray-50 rounded border space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Specification name"
                        value={item.name}
                        onChange={e => {
                          const newSpecs = [...formData.additionalSpecifications];
                          newSpecs[itemIdx].name = e.target.value;
                          setFormData({ ...formData, additionalSpecifications: newSpecs });
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSpecs = formData.additionalSpecifications.filter((_, i) => i !== itemIdx);
                          setFormData({ ...formData, additionalSpecifications: newSpecs });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                        <span>Value</span>
                        <span>Price Change</span>
                      </div>
                      {item.values.map((value, valueIdx) => (
                        <div key={valueIdx} className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Value name"
                            value={value.name}
                            onChange={e => {
                              const newSpecs = [...formData.additionalSpecifications];
                              newSpecs[itemIdx].values[valueIdx].name = e.target.value;
                              setFormData({ ...formData, additionalSpecifications: newSpecs });
                            }}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={value.priceChange || 0}
                              onChange={e => {
                                const newSpecs = [...formData.additionalSpecifications];
                                newSpecs[itemIdx].values[valueIdx].priceChange = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, additionalSpecifications: newSpecs });
                              }}
                              className="text-sm"
                            />
                            {item.values.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newSpecs = [...formData.additionalSpecifications];
                                  newSpecs[itemIdx].values = newSpecs[itemIdx].values.filter((_, i) => i !== valueIdx);
                                  setFormData({ ...formData, additionalSpecifications: newSpecs });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newSpecs = [...formData.additionalSpecifications];
                          newSpecs[itemIdx].values.push({ name: '', priceChange: 0 });
                          setFormData({ ...formData, additionalSpecifications: newSpecs });
                        }}
                      >
                        Add Value
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      additionalSpecifications: [...formData.additionalSpecifications, {
                        name: '',
                        values: [{ name: '', priceChange: 0 }]
                      }]
                    });
                  }}
                >
                  Add Specification Item
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
