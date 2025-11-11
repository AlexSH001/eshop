"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";
import Image from "next/image";

export default function Footer() {
  const { settings } = useSettings();
  
  const storeName = settings?.store?.name || 'Shop';
  const storeDescription = settings?.store?.description || 'Your one-stop shop for quality products across all categories. Secure payments with multiple options.';
  const logo = settings?.appearance?.logo;
  const primaryColor = settings?.appearance?.primaryColor || '#000000';

  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center space-x-2">
              {logo ? (
                <div className="relative h-8 w-8">
                  <Image
                    src={logo}
                    alt={storeName}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShoppingBag className="h-5 w-5" />
                </div>
              )}
              <span 
                className="text-xl font-semibold text-gray-900"
                style={{ color: primaryColor }}
              >
                {storeName}
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              {storeDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">Alipay</Badge>
              <Badge variant="outline" className="text-xs">WeChat Pay</Badge>
              <Badge variant="outline" className="text-xs">PayPal</Badge>
              <Badge variant="outline" className="text-xs">Credit Cards</Badge>
            </div>
          </div>

          <div>
            <h3 
              className="font-semibold text-gray-900"
              style={{ color: primaryColor }}
            >
              {storeName}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><Link href="/categories/electronics" className="hover:text-gray-900">Electronics</Link></li>
              <li><Link href="/categories/fashion" className="hover:text-gray-900">Fashion</Link></li>
              <li><Link href="/categories/home-garden" className="hover:text-gray-900">Home & Garden</Link></li>
              <li><Link href="/categories/sports" className="hover:text-gray-900">Sports</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Customer Service</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><Link href="/orders" className="hover:text-gray-900">My Orders</Link></li>
              <li><Link href="/wishlist" className="hover:text-gray-900">Wishlist</Link></li>
              <li><Link href="/profile" className="hover:text-gray-900">Account</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">About</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900">Terms & Conditions</Link></li>
              <li><Link href="/contact" className="hover:text-gray-900">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved. Secure payments supported worldwide.</p>
        </div>
      </div>
    </footer>
  );
}

