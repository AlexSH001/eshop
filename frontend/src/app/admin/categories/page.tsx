"use client";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Upload, X } from "lucide-react";
import { adminApiRequestJson, adminApiRequest } from "@/lib/admin-api";
import { availableGradients } from "@/config/categoryGradients";

export const dynamic = 'force-dynamic';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  gradient_from?: string;
  gradient_to?: string;
}

type CategoryFormData = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  gradientFrom: string;
  gradientTo: string;
};

export default function AdminCategoriesPage() {
  const { isAuthenticated, isLoading, user } = useAdmin();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    icon: "",
    image: "",
    gradientFrom: "",
    gradientTo: ""
  });
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch categories from backend
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApiRequestJson<{ categories: Category[] }>('/categories/admin/list');
      setCategories(data.categories);
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Helper function to make authenticated file upload requests
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const adminToken = localStorage.getItem('admin_token');
    
    if (!adminToken) {
      throw new Error('Admin authentication required. Please login again.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${adminToken}`,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }

    return response;
  };

  // Handle category image upload
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const res = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/category-image`,
        {
          method: 'POST',
          body: uploadFormData
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        image: data.file.url
      }));
      toast.success('Image uploaded successfully');
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Failed to upload image';
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image removal
  const handleImageRemove = async () => {
    if (!formData.image) return;

    try {
      const res = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/category-image`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: formData.image })
        }
      );

      if (res.ok) {
        setFormData(prev => ({
          ...prev,
          image: ""
        }));
        toast.success('Image removed successfully');
      }
    } catch (err) {
      console.error('Error removing image:', err);
      // Still remove from form even if deletion fails
      setFormData(prev => ({
        ...prev,
        image: ""
      }));
    }
  };

  const handleAddCategory = async () => {
    setLoading(true);
    setError(null);
    try {
      await adminApiRequestJson('/categories', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      toast.success('Category added successfully');
      setIsAddModalOpen(false);
      setFormData({ name: "", slug: "", description: "", icon: "", image: "", gradientFrom: "", gradientTo: "" });
      fetchCategories();
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to add category');
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    setLoading(true);
    setError(null);
    try {
      await adminApiRequestJson(`/categories/${editingCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      toast.success('Category updated successfully');
      setEditingCategory(null);
      setFormData({ name: "", slug: "", description: "", icon: "", image: "", gradientFrom: "", gradientTo: "" });
      fetchCategories();
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to update category');
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setLoading(true);
    setError(null);
    try {
      await adminApiRequestJson(`/categories/${deletingCategory.id}`, {
        method: 'DELETE'
      });
      toast.success('Category deleted successfully');
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to delete category');
      if (errorMessage.includes('Session expired') || errorMessage.includes('authentication')) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  placeholder="Slug"
                  value={formData.slug}
                  onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Input
                  placeholder="Icon"
                  value={formData.icon}
                  onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, icon: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  placeholder="Description"
                  value={formData.description}
                  onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="image">Category Image</Label>
                {formData.image ? (
                  <div className="relative mt-2">
                    <img
                      src={formData.image}
                      alt="Category preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleImageRemove}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP (MAX. 5MB)</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">Recommended: 16:9 aspect ratio (e.g., 1920×1080)</p>
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                        disabled={uploadingImage}
                      />
                    </label>
                    {uploadingImage && (
                      <p className="mt-2 text-sm text-gray-500">Uploading image...</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="gradient">Gradient Color</Label>
                <Select
                  value={formData.gradientFrom && formData.gradientTo 
                    ? `${formData.gradientFrom}|${formData.gradientTo}` 
                    : "default"}
                  onValueChange={(value) => {
                    if (value && value !== "default") {
                      const [from, to] = value.split('|');
                      setFormData((prev: CategoryFormData) => ({ ...prev, gradientFrom: from, gradientTo: to }));
                    } else {
                      setFormData((prev: CategoryFormData) => ({ ...prev, gradientFrom: "", gradientTo: "" }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gradient color (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Auto-generated)</SelectItem>
                    {availableGradients.map((gradient, index) => (
                      <SelectItem key={index} value={`${gradient.from}|${gradient.to}`}>
                        {gradient.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddCategory} disabled={loading || uploadingImage}>
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{category.name}</CardTitle>
                <Badge>{category.icon}</Badge>
              </CardHeader>
              <CardContent>
                {category.image && (
                  <div className="mb-3">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="text-sm text-gray-600 mb-2">{category.description}</div>
                <div className="flex gap-2">
                  <Dialog open={editingCategory?.id === category.id} onOpenChange={open => {
                    if (!open) setEditingCategory(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingCategory(category);
                        setFormData({
                          name: category.name,
                          slug: category.slug,
                          description: category.description,
                          icon: category.icon,
                          image: category.image || "",
                          gradientFrom: category.gradient_from || "",
                          gradientTo: category.gradient_to || ""
                        });
                      }}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Category Name</Label>
                          <Input
                            placeholder="Name"
                            value={formData.name}
                            onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="slug">Slug</Label>
                          <Input
                            placeholder="Slug"
                            value={formData.slug}
                            onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, slug: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="icon">Icon</Label>
                          <Input
                            placeholder="Icon"
                            value={formData.icon}
                            onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, icon: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            placeholder="Description"
                            value={formData.description}
                            onChange={e => setFormData((prev: CategoryFormData) => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-image">Category Image</Label>
                          {formData.image ? (
                            <div className="relative mt-2">
                              <img
                                src={formData.image}
                                alt="Category preview"
                                className="w-full h-48 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={handleImageRemove}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-2">
                              <label
                                htmlFor="edit-image-upload"
                                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                              >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                  <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP (MAX. 5MB)</p>
                                  <p className="text-xs text-blue-600 font-medium mt-1">Recommended: 16:9 aspect ratio (e.g., 1920×1080)</p>
                                </div>
                                <input
                                  id="edit-image-upload"
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleImageUpload(file);
                                    }
                                  }}
                                  disabled={uploadingImage}
                                />
                              </label>
                              {uploadingImage && (
                                <p className="mt-2 text-sm text-gray-500">Uploading image...</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="gradient">Gradient Color</Label>
                          <Select
                            value={formData.gradientFrom && formData.gradientTo 
                              ? `${formData.gradientFrom}|${formData.gradientTo}` 
                              : "default"}
                            onValueChange={(value) => {
                              if (value && value !== "default") {
                                const [from, to] = value.split('|');
                                setFormData((prev: CategoryFormData) => ({ ...prev, gradientFrom: from, gradientTo: to }));
                              } else {
                                setFormData((prev: CategoryFormData) => ({ ...prev, gradientFrom: "", gradientTo: "" }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gradient color (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default (Auto-generated)</SelectItem>
                              {availableGradients.map((gradient, index) => (
                                <SelectItem key={index} value={`${gradient.from}|${gradient.to}`}>
                                  {gradient.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleEditCategory} disabled={loading || uploadingImage}>
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {user?.role === 'super_admin' && (
                    <Dialog open={deletingCategory?.id === category.id} onOpenChange={open => {
                      if (!open) setDeletingCategory(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingCategory(category)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Delete Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>Are you sure you want to delete this category?</div>
                        <Button onClick={handleDeleteCategory} disabled={loading}>
                          Confirm Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
} 