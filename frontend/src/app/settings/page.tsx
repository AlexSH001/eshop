"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  ArrowLeft,
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { changePassword } from "@/lib/api";

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.currentPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <Settings className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-8">
            Please sign in to view your settings
          </p>
          <Link href="/">
            <Button size="lg" className="bg-gray-50 hover:bg-gray-800">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Shopping</span>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                <Settings className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Settings</span>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and security</p>
        </div>

        <div className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg font-semibold">Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Password</h3>
                    <p className="text-sm text-gray-500">Change your account password</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        placeholder="Enter current password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        placeholder="Enter new password (min. 8 characters)"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 8 characters long
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        placeholder="Confirm new password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                      className="bg-black hover:bg-gray-800"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </Button>
                    {(passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword) && (
                      <Button
                        variant="outline"
                        onClick={handleCancelPasswordChange}
                        disabled={isChangingPassword}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg font-semibold">Account Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Cannot change
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Account Status</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences (Placeholder for future features) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg font-semibold">Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Notification and preference settings will be available soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

