"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { 
  Shield, 
  Save, 
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";

export const dynamic = 'force-dynamic';

interface Permission {
  key: string;
  allowed: boolean;
}

interface PermissionGroup {
  [category: string]: Permission[];
}

export default function PermissionsPage() {
  const { isAuthenticated, isLoading, user } = useAdmin();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [adminPermissions, setAdminPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<PermissionGroup>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check if user is super admin
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      toast.error('Only super admins can manage permissions');
      router.push('/admin/settings');
    }
  }, [user, router]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Fetch all permissions grouped by category
      const allRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/admin/permissions/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!allRes.ok) throw new Error('Failed to fetch permissions');

      const allData = await allRes.json();

      // Fetch admin role permissions
      const roleRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/admin/permissions/role/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!roleRes.ok) throw new Error('Failed to fetch role permissions');

      const roleData = await roleRes.json();

      // Group permissions by category
      const grouped: PermissionGroup = {};
      const cats: string[] = [];

      roleData.permissions.forEach((perm: Permission) => {
        const [category] = perm.key.split('.');
        if (!grouped[category]) {
          grouped[category] = [];
          cats.push(category);
        }
        grouped[category].push(perm);
      });

      // Sort categories
      cats.sort();

      setAdminPermissions(roleData.permissions);
      setGroupedPermissions(grouped);
      setCategories(cats);

      // Store original state for change detection
      const original: Record<string, boolean> = {};
      roleData.permissions.forEach((p: Permission) => {
        original[p.key] = p.allowed;
      });
      setOriginalPermissions(original);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'super_admin') {
      fetchPermissions();
    }
  }, [isAuthenticated, user]);

  const handlePermissionToggle = (permissionKey: string, allowed: boolean) => {
    setAdminPermissions(prev => {
      const updated = prev.map(p => 
        p.key === permissionKey ? { ...p, allowed } : p
      );

      // Update grouped permissions
      const newGrouped: PermissionGroup = {};
      Object.keys(groupedPermissions).forEach(category => {
        newGrouped[category] = groupedPermissions[category].map(p =>
          p.key === permissionKey ? { ...p, allowed } : p
        );
      });
      setGroupedPermissions(newGrouped);

      // Check for changes
      const currentState: Record<string, boolean> = {};
      updated.forEach(p => {
        currentState[p.key] = p.allowed;
      });

      const changed = JSON.stringify(currentState) !== JSON.stringify(originalPermissions);
      setHasChanges(changed);

      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Build permissions object
      const permissions: Record<string, boolean> = {};
      adminPermissions.forEach(p => {
        permissions[p.key] = p.allowed;
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/admin/permissions/role/admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update permissions');
      }

      // Update original state
      setOriginalPermissions(permissions);
      setHasChanges(false);
      toast.success('Permissions updated successfully');
      
      // Refresh to get latest state
      await fetchPermissions();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all permissions to defaults? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/admin/permissions/role/admin/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reset permissions');
      }

      toast.success('Permissions reset to defaults');
      await fetchPermissions();
    } catch (error: any) {
      console.error('Error resetting permissions:', error);
      toast.error(error.message || 'Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'admins': 'Admin Management',
      'users': 'User Management',
      'products': 'Product Management',
      'categories': 'Category Management',
      'orders': 'Order Management',
      'dashboard': 'Dashboard',
      'analytics': 'Analytics',
      'settings': 'System Settings',
      'system': 'System'
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getPermissionLabel = (key: string): string => {
    const [, action] = key.split('.');
    const labels: Record<string, string> = {
      'view': 'View',
      'create': 'Create',
      'update': 'Update',
      'delete': 'Delete',
      'toggle_status': 'Toggle Status',
      'publish': 'Publish',
      'cancel': 'Cancel',
      'refund': 'Refund',
      'export': 'Export',
      'health': 'System Health'
    };
    return labels[action] || action;
  };

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (user?.role !== 'super_admin') {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">Only super admins can manage permissions.</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Role Permissions
            </h1>
            <p className="text-gray-600 mt-1">
              Manage permissions for the admin role. Super admin always has all permissions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Permissions by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Role Permissions</CardTitle>
            <CardDescription>
              Toggle permissions to control what actions admins can perform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={categories[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                {categories.map(category => (
                  <TabsTrigger key={category} value={category}>
                    {getCategoryLabel(category)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map(category => (
                <TabsContent key={category} value={category} className="space-y-4 mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groupedPermissions[category]?.map(permission => (
                      <div
                        key={permission.key}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <Label htmlFor={permission.key} className="text-sm font-medium">
                            {getPermissionLabel(permission.key)}
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">{permission.key}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {permission.allowed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-300" />
                          )}
                          <Switch
                            id={permission.key}
                            checked={permission.allowed}
                            onCheckedChange={(checked) => handlePermissionToggle(permission.key, checked)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About Permissions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Permissions are stored in the database and override default configurations</li>
                  <li>• Super admin role always has all permissions regardless of settings</li>
                  <li>• Changes take effect immediately after saving</li>
                  <li>• Use "Reset to Defaults" to restore original permission settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

