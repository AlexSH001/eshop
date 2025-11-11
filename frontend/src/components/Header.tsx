"use client";

import Link from "next/link";
import { ShoppingBag, Search, Heart, User, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import SearchBar from "./SearchBar";
import UserDropdown from "./UserDropdown";
import ShoppingCartSheet from "./ShoppingCart";
import AuthModal from "./AuthModal";
import Image from "next/image";

interface HeaderProps {
  showSearch?: boolean;
}

export default function Header({ showSearch = true }: HeaderProps) {
  const { settings } = useSettings();
  const { isAuthenticated } = useAuth();
  const { state: wishlistState } = useWishlist();

  const storeName = settings?.store?.name || 'Shop';
  const logo = settings?.appearance?.logo;
  const primaryColor = settings?.appearance?.primaryColor || '#000000';

  return (
    <header 
      className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm"
      style={{ 
        borderBottomColor: primaryColor + '20',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
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
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Desktop Search */}
            {showSearch && (
              <div className="hidden md:block">
                <SearchBar />
              </div>
            )}

            {/* Wishlist */}
            {isAuthenticated ? (
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                  <Heart className="h-5 w-5" />
                  {wishlistState.itemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                      {wishlistState.itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <Heart className="h-5 w-5" />
              </Button>
            )}

            {/* User */}
            {isAuthenticated ? (
              <UserDropdown />
            ) : (
              <AuthModal>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </AuthModal>
            )}

            {/* Cart */}
            <ShoppingCartSheet />
          </div>
        </div>
      </div>
    </header>
  );
}

