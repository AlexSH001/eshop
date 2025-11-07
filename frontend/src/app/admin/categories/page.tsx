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
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

type CategoryFormData = {
  name: string;
  slug: string;
  description: string;
  icon: string;
};

export default function AdminCategoriesPage() {
  const { isAuthenticated, isLoading } = useAdmin();
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
    icon: ""
  });
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

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
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch('https://backend.fortunewhisper.com/api/categories/admin/list', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.categories);
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch('https://backend.fortunewhisper.com/api/categories', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to add category');
      toast.success('Category added successfully');
      setIsAddModalOpen(false);
      setFormData({ name: "", slug: "", description: "", icon: "" });
      fetchCategories();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch(`https://backend.fortunewhisper.com/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to update category');
      toast.success('Category updated successfully');
      setEditingCategory(null);
      setFormData({ name: "", slug: "", description: "", icon: "" });
      fetchCategories();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch(`https://backend.fortunewhisper.com/api/categories/${deletingCategory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete category');
      toast.success('Category deleted successfully');
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to delete category');
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
              <Button onClick={handleAddCategory} disabled={loading}>
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
                          icon: category.icon
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
                        <Button onClick={handleEditCategory} disabled={loading}>
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
} 