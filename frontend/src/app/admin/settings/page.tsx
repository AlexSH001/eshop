"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { adminApiRequestJson } from "@/lib/admin-api";
import { 
  Save, 
  Store, 
  Mail, 
  Shield, 
  CreditCard, 
  Truck,
  Palette,
  Bell,
  Database,
  Key
} from "lucide-react";

export const dynamic = 'force-dynamic';

interface SettingsData {
  store: {
    name: string;
    description: string;
    email: string;
    phone: string;
    address: string;
    currency: string;
    timezone: string;
    taxRate: number;
  };
  email: {
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
    fromName: string;
  };
  payment: {
    stripeEnabled: boolean;
    stripePublishableKey: string;
    stripeSecretKey: string;
    paypalEnabled: boolean;
    paypalClientId: string;
    paypalSecret: string;
  };
  shipping: {
    freeShippingThreshold: number;
    defaultShippingCost: number;
    shippingZones: Array<{
      id: string;
      name: string;
      cost: number;
    }>;
  };
  appearance: {
    primaryColor: string;
    logo: string;
    favicon: string;
    theme: 'light' | 'dark' | 'auto';
  };
  notifications: {
    orderNotifications: boolean;
    lowStockNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    twoFactorAuth: boolean;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  };
}

export default function AdminSettingsPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData>({
    store: {
      name: '',
      description: '',
      email: '',
      phone: '',
      address: '',
      currency: 'USD',
      timezone: 'UTC',
      taxRate: 0.08
    },
    email: {
      smtpHost: '',
      smtpPort: '',
      smtpUser: '',
      smtpPass: '',
      fromEmail: '',
      fromName: ''
    },
    payment: {
      stripeEnabled: true,
      stripePublishableKey: '',
      stripeSecretKey: '',
      paypalEnabled: false,
      paypalClientId: '',
      paypalSecret: ''
    },
    shipping: {
      freeShippingThreshold: 0,
      defaultShippingCost: 0,
      shippingZones: []
    },
    appearance: {
      primaryColor: '#000000',
      logo: '',
      favicon: '',
      theme: 'light'
    },
    notifications: {
      orderNotifications: true,
      lowStockNotifications: true,
      emailNotifications: true,
      smsNotifications: false
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      twoFactorAuth: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false
      }
    }
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedSettings = await adminApiRequestJson<Partial<SettingsData>>('/admin/settings');
      
      // Merge fetched settings with defaults to ensure all sections exist
      setSettings(prev => ({
        store: { ...prev.store, ...(fetchedSettings.store || {}) },
        email: { ...prev.email, ...(fetchedSettings.email || {}) },
        payment: { ...prev.payment, ...(fetchedSettings.payment || {}) },
        shipping: { ...prev.shipping, ...(fetchedSettings.shipping || {}) },
        appearance: { ...prev.appearance, ...(fetchedSettings.appearance || {}) },
        notifications: { ...prev.notifications, ...(fetchedSettings.notifications || {}) },
        security: { 
          ...prev.security, 
          ...(fetchedSettings.security || {}),
          passwordPolicy: {
            ...prev.security.passwordPolicy,
            ...(fetchedSettings.security?.passwordPolicy || {})
          }
        }
      }));
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      setError(errorMessage);
      // Don't show error toast if settings don't exist yet (first time setup)
      // Settings will use default values
      if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
        console.error('Failed to fetch settings:', err);
        // Continue with default settings
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  const handleSave = async (section: keyof SettingsData) => {
    setSaving(true);
    try {
      await adminApiRequestJson(`/admin/settings/${section}`, {
        method: 'PUT',
        body: JSON.stringify(settings[section])
      });
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`);
      
      // If store or appearance settings were saved, trigger a page refresh to apply changes
      if (section === 'store' || section === 'appearance') {
        // Dispatch a custom event that SettingsContext can listen to
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('settingsUpdated'));
        }
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown error';
      toast.error(`Failed to save ${section} settings: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (section: keyof SettingsData, field: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage your store configuration and preferences</p>
        </div>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="store" className="flex items-center">
              <Store className="h-4 w-4 mr-2" />
              Store
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex items-center">
              <Truck className="h-4 w-4 mr-2" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Store Settings */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={settings.store.name}
                      onChange={(e) => updateSettings('store', 'name', e.target.value)}
                      placeholder="eshop"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storeEmail">Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      value={settings.store.email}
                      onChange={(e) => updateSettings('store', 'email', e.target.value)}
                      placeholder="contact@eshop.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storePhone">Phone</Label>
                    <Input
                      id="storePhone"
                      value={settings.store.phone}
                      onChange={(e) => updateSettings('store', 'phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storeCurrency">Currency</Label>
                    <Select value={settings.store.currency} onValueChange={(value) => updateSettings('store', 'currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="SGD">SGD (S$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.store.taxRate * 100}
                      onChange={(e) => updateSettings('store', 'taxRate', parseFloat(e.target.value) / 100 || 0)}
                      placeholder="8.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter as percentage (e.g., 8 for 8%)</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="storeDescription">Description</Label>
                  <Textarea
                    id="storeDescription"
                    value={settings.store.description}
                    onChange={(e) => updateSettings('store', 'description', e.target.value)}
                    placeholder="Brief description of your store"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="storeAddress">Address</Label>
                  <Textarea
                    id="storeAddress"
                    value={settings.store.address}
                    onChange={(e) => updateSettings('store', 'address', e.target.value)}
                    placeholder="Store address"
                    rows={2}
                  />
                </div>
                <Button onClick={() => handleSave('store')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Store Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={settings.email.smtpHost || ''}
                      onChange={(e) => updateSettings('email', 'smtpHost', e.target.value)}
                      placeholder={settings.email.smtpHost ? undefined : 'N/A'}
                    />
                    {!settings.email.smtpHost && (
                      <p className="text-xs text-gray-500 mt-1">Current: N/A</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      value={settings.email.smtpPort || ''}
                      onChange={(e) => updateSettings('email', 'smtpPort', e.target.value)}
                      placeholder={settings.email.smtpPort ? undefined : 'N/A'}
                    />
                    {!settings.email.smtpPort && (
                      <p className="text-xs text-gray-500 mt-1">Current: N/A</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={settings.email.smtpUser || ''}
                      onChange={(e) => updateSettings('email', 'smtpUser', e.target.value)}
                      placeholder={settings.email.smtpUser ? undefined : 'N/A'}
                    />
                    {!settings.email.smtpUser && (
                      <p className="text-xs text-gray-500 mt-1">Current: N/A</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="smtpPass">SMTP Password</Label>
                    <Input
                      id="smtpPass"
                      type="password"
                      value={settings.email.smtpPass || ''}
                      onChange={(e) => updateSettings('email', 'smtpPass', e.target.value)}
                      placeholder={settings.email.smtpPass ? undefined : 'N/A (leave blank to keep current)'}
                    />
                    {!settings.email.smtpPass && (
                      <p className="text-xs text-gray-500 mt-1">Current: N/A</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={settings.email.fromEmail || ''}
                      onChange={(e) => updateSettings('email', 'fromEmail', e.target.value)}
                      placeholder={settings.email.fromEmail ? undefined : 'N/A'}
                    />
                    {!settings.email.fromEmail && (
                      <p className="text-xs text-gray-500 mt-1">Current: N/A</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={settings.email.fromName || ''}
                      onChange={(e) => updateSettings('email', 'fromName', e.target.value)}
                      placeholder={settings.email.fromName ? undefined : 'N/A'}
                    />
                    {!settings.email.fromName && (
                      <p className="text-xs text-gray-500 mt-1">Current: N/A</p>
                    )}
                  </div>
                </div>
                <Button onClick={() => handleSave('email')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stripe Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.payment.stripeEnabled}
                      onCheckedChange={(checked) => updateSettings('payment', 'stripeEnabled', checked)}
                    />
                    <Label>Enable Stripe</Label>
                  </div>
                  {settings.payment.stripeEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                      <div>
                        <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                        <Input
                          id="stripePublishableKey"
                          value={settings.payment.stripePublishableKey}
                          onChange={(e) => updateSettings('payment', 'stripePublishableKey', e.target.value)}
                          placeholder="pk_test_..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="stripeSecretKey">Secret Key</Label>
                        <Input
                          id="stripeSecretKey"
                          type="password"
                          value={settings.payment.stripeSecretKey}
                          onChange={(e) => updateSettings('payment', 'stripeSecretKey', e.target.value)}
                          placeholder="sk_test_..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PayPal Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.payment.paypalEnabled}
                      onCheckedChange={(checked) => updateSettings('payment', 'paypalEnabled', checked)}
                    />
                    <Label>Enable PayPal</Label>
                  </div>
                  {settings.payment.paypalEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                      <div>
                        <Label htmlFor="paypalClientId">Client ID</Label>
                        <Input
                          id="paypalClientId"
                          value={settings.payment.paypalClientId}
                          onChange={(e) => updateSettings('payment', 'paypalClientId', e.target.value)}
                          placeholder="Your PayPal Client ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="paypalSecret">Secret</Label>
                        <Input
                          id="paypalSecret"
                          type="password"
                          value={settings.payment.paypalSecret}
                          onChange={(e) => updateSettings('payment', 'paypalSecret', e.target.value)}
                          placeholder="Your PayPal Secret"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={() => handleSave('payment')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Payment Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Settings */}
          <TabsContent value="shipping">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="freeShippingThreshold">Free Shipping Threshold</Label>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      value={settings.shipping.freeShippingThreshold}
                      onChange={(e) => updateSettings('shipping', 'freeShippingThreshold', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultShippingCost">Default Shipping Cost</Label>
                    <Input
                      id="defaultShippingCost"
                      type="number"
                      value={settings.shipping.defaultShippingCost}
                      onChange={(e) => updateSettings('shipping', 'defaultShippingCost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Button onClick={() => handleSave('shipping')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Shipping Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance & Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.appearance.primaryColor}
                      onChange={(e) => updateSettings('appearance', 'primaryColor', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={settings.appearance.theme} onValueChange={(value) => updateSettings('appearance', 'theme', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logo">Logo URL</Label>
                    <Input
                      id="logo"
                      value={settings.appearance.logo}
                      onChange={(e) => updateSettings('appearance', 'logo', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <Label htmlFor="favicon">Favicon URL</Label>
                    <Input
                      id="favicon"
                      value={settings.appearance.favicon}
                      onChange={(e) => updateSettings('appearance', 'favicon', e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                </div>
                <Button onClick={() => handleSave('appearance')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Appearance Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Order Notifications</Label>
                      <p className="text-sm text-gray-500">Get notified when new orders are placed</p>
                    </div>
                    <Switch
                      checked={settings.notifications.orderNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'orderNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Low Stock Notifications</Label>
                      <p className="text-sm text-gray-500">Get notified when products are running low</p>
                    </div>
                    <Switch
                      checked={settings.notifications.lowStockNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'lowStockNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={settings.notifications.smsNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'smsNotifications', checked)}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSave('notifications')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value) || 30)}
                      min="5"
                      max="480"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value) || 5)}
                      min="3"
                      max="10"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Require 2FA for admin access</p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorAuth}
                      onCheckedChange={(checked) => updateSettings('security', 'twoFactorAuth', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Password Policy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minPasswordLength">Minimum Length</Label>
                      <Input
                        id="minPasswordLength"
                        type="number"
                        value={settings.security.passwordPolicy.minLength}
                        onChange={(e) => updateSettings('security', 'passwordPolicy', {
                          ...settings.security.passwordPolicy,
                          minLength: parseInt(e.target.value) || 8
                        })}
                        min="6"
                        max="32"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.security.passwordPolicy.requireUppercase}
                        onCheckedChange={(checked) => updateSettings('security', 'passwordPolicy', {
                          ...settings.security.passwordPolicy,
                          requireUppercase: checked
                        })}
                      />
                      <Label>Require uppercase letters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.security.passwordPolicy.requireLowercase}
                        onCheckedChange={(checked) => updateSettings('security', 'passwordPolicy', {
                          ...settings.security.passwordPolicy,
                          requireLowercase: checked
                        })}
                      />
                      <Label>Require lowercase letters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.security.passwordPolicy.requireNumbers}
                        onCheckedChange={(checked) => updateSettings('security', 'passwordPolicy', {
                          ...settings.security.passwordPolicy,
                          requireNumbers: checked
                        })}
                      />
                      <Label>Require numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.security.passwordPolicy.requireSymbols}
                        onCheckedChange={(checked) => updateSettings('security', 'passwordPolicy', {
                          ...settings.security.passwordPolicy,
                          requireSymbols: checked
                        })}
                      />
                      <Label>Require symbols</Label>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('security')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
} 