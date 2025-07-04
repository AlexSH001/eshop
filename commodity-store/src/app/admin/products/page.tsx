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

export default function AdminProductsPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "Wireless Bluetooth Headphones",
      price: 89.99,
      originalPrice: 129.99,
      category: "Electronics",
      stock: 45,
      description: "High-quality wireless headphones with noise cancellation",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop",
      status: "active",
      createdAt: "2024-01-15",
      sales: 245
    },
    {
      id: 2,
      name: "Smart Phone",
      price: 699.99,
      originalPrice: 799.99,
      category: "Electronics",
      stock: 23,
      description: "Latest smartphone with advanced features",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop",
      status: "active",
      createdAt: "2024-01-14",
      sales: 89
    },
    {
      id: 3,
      name: "Cotton T-Shirt",
      price: 24.99,
      originalPrice: 39.99,
      category: "Fashion",
      stock: 156,
      description: "Comfortable cotton t-shirt in various colors",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
      status: "active",
      createdAt: "2024-01-13",
      sales: 356
    },
    {
      id: 4,
      name: "Gaming Mouse",
      price: 79.99,
      originalPrice: 99.99,
      category: "Gaming",
      stock: 0,
      description: "High-precision gaming mouse with RGB lighting",
      image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop",
      status: "inactive",
      createdAt: "2024-01-12",
      sales: 178
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    originalPrice: "",
    category: "",
    stock: "",
    description: "",
    image: "",
    status: "active" as "active" | "inactive"
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
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

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-center text-gray-500">Product management interface would go here.</p>
          <p className="text-center text-sm text-gray-400 mt-2">This is a demo admin panel.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
