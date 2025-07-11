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
};

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
    status: "active"
  });
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Helper function to get category ID by name
  const getCategoryIdByName = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.id.toString() : '';
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
        const mappedProducts: Product[] = data.products.map((p: Record<string, unknown>) => ({
          id: p.id as number,
          name: p.name as string,
          price: p.price as number,
          originalPrice: p.original_price as number | undefined,
          category: (p.category_name as string) || '',
          stock: p.stock as number,
          description: p.description as string,
          image: (p.featured_image as string) || ((p.images as string[] | undefined)?.[0] ?? ''),
          status: p.status as 'active' | 'inactive',
          createdAt: p.created_at as string,
          sales: (p.sales_count as number) || 0
        }));
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
          categoryId: formData.categoryId, // Use categoryId from formData
          stock: parseInt(formData.stock),
          status: formData.status,
          featuredImage: formData.image,
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
          category: product.category_name || '',
          stock: product.stock,
          description: product.description,
          image: product.featured_image || (product.images && product.images[0]) || '',
          status: product.status,
          createdAt: product.created_at,
          sales: product.sales_count || 0
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
        status: "active"
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
          categoryId: formData.categoryId, // Add categoryId to the update request
          stock: parseInt(formData.stock),
          status: formData.status,
          featuredImage: formData.image,
        })
      });
      if (!res.ok) throw new Error('Failed to update product');
      const { product } = await res.json();
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? {
              id: product.id,
              name: product.name,
              price: product.price,
              originalPrice: product.original_price,
              category: product.category_name || '',
              stock: product.stock,
              description: product.description,
              image: product.featured_image || (product.images && product.images[0]) || '',
              status: product.status,
              createdAt: product.created_at,
              sales: product.sales_count || 0
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
        status: "active"
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
          <Button onClick={() => setIsAddModalOpen(true)}>
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
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingProduct(product);
                      setFormData({
                        name: product.name,
                        price: product.price.toString(),
                        originalPrice: product.originalPrice?.toString() || '',
                        categoryId: getCategoryIdByName(product.category), // Get category ID by name
                        stock: product.stock.toString(),
                        description: product.description,
                        image: product.image,
                        status: product.status
                      });
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
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-md bg-white">
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
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                />
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
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600">
                Add Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-md bg-white">
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
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                />
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
