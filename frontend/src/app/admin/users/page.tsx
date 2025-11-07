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

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

type UserFormData = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  password: string;
};

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    firstName: "",
    lastName: "",
    role: "user",
    status: "active",
    password: ""
  });
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch users from backend
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch('https://fortunewhisper.com/backend/api/admin/users/authenticated', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch('https://fortunewhisper.com/backend/api/users', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to add user');
      toast.success('User added successfully');
      setIsAddModalOpen(false);
      setFormData({ email: "", firstName: "", lastName: "", role: "user", status: "active", password: "" });
      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch(`https://fortunewhisper.com/backend/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to update user');
      toast.success('User updated successfully');
      setEditingUser(null);
      setFormData({ email: "", firstName: "", lastName: "", role: "user", status: "active", password: "" });
      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const res = await fetch(`https://fortunewhisper.com/backend/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete user');
      toast.success('User deleted successfully');
      setDeletingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message || 'Unknown error');
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Email"
                value={formData.email}
                onChange={e => setFormData((prev: UserFormData) => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="First Name"
                value={formData.firstName}
                onChange={e => setFormData((prev: UserFormData) => ({ ...prev, firstName: e.target.value }))}
              />
              <Input
                placeholder="Last Name"
                value={formData.lastName}
                onChange={e => setFormData((prev: UserFormData) => ({ ...prev, lastName: e.target.value }))}
              />
              <Input
                placeholder="Password"
                type="password"
                value={formData.password}
                onChange={e => setFormData((prev: UserFormData) => ({ ...prev, password: e.target.value }))}
              />
              <Input
                placeholder="Role (user/admin)"
                value={formData.role}
                onChange={e => setFormData((prev: UserFormData) => ({ ...prev, role: e.target.value }))}
              />
              <Input
                placeholder="Status (active/inactive)"
                value={formData.status}
                onChange={e => setFormData((prev: UserFormData) => ({ ...prev, status: e.target.value }))}
              />
              <Button onClick={handleAddUser} disabled={loading}>
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
          {users.map(user => (
            <Card key={user.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{user.firstName} {user.lastName}</CardTitle>
                <Badge>{user.role}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-2">{user.email}</div>
                <div className="flex gap-2">
                  <Dialog open={editingUser?.id === user.id} onOpenChange={open => {
                    if (!open) setEditingUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingUser(user);
                        setFormData({
                          email: user.email,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          role: user.role,
                          status: user.status,
                          password: ""
                        });
                      }}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Email"
                          value={formData.email}
                          onChange={e => setFormData((prev: UserFormData) => ({ ...prev, email: e.target.value }))}
                        />
                        <Input
                          placeholder="First Name"
                          value={formData.firstName}
                          onChange={e => setFormData((prev: UserFormData) => ({ ...prev, firstName: e.target.value }))}
                        />
                        <Input
                          placeholder="Last Name"
                          value={formData.lastName}
                          onChange={e => setFormData((prev: UserFormData) => ({ ...prev, lastName: e.target.value }))}
                        />
                        <Input
                          placeholder="Password (leave blank to keep current)"
                          type="password"
                          value={formData.password}
                          onChange={e => setFormData((prev: UserFormData) => ({ ...prev, password: e.target.value }))}
                        />
                        <Input
                          placeholder="Role (user/admin)"
                          value={formData.role}
                          onChange={e => setFormData((prev: UserFormData) => ({ ...prev, role: e.target.value }))}
                        />
                        <Input
                          placeholder="Status (active/inactive)"
                          value={formData.status}
                          onChange={e => setFormData((prev: UserFormData) => ({ ...prev, status: e.target.value }))}
                        />
                        <Button onClick={handleEditUser} disabled={loading}>
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={deletingUser?.id === user.id} onOpenChange={open => {
                    if (!open) setDeletingUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setDeletingUser(user)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>Are you sure you want to delete this user?</div>
                        <Button onClick={handleDeleteUser} disabled={loading}>
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