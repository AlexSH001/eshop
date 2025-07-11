"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import MobileSearchBar from "@/components/MobileSearchBar";
import ShoppingCartSheet from "@/components/ShoppingCart";
import { Home, Search, Heart, ShoppingBag, Grid3X3 } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { state: cartState } = useCart();
  const { state: wishlistState } = useWishlist();
  const { isAuthenticated } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 sm:hidden">
      <div className="flex items-center justify-around">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center justify-center h-12 w-12 p-1 rounded-lg transition-colors ${
              pathname === "/" ? "text-black bg-gray-100" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Button>
        </Link>

        <Link href="/categories">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center justify-center h-12 w-12 p-1 rounded-lg transition-colors ${
              pathname === "/categories" ? "text-black bg-gray-100" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Grid3X3 className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Categories</span>
          </Button>
        </Link>

        <MobileSearchBar>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center h-12 w-12 p-1 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <Search className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Search</span>
          </Button>
        </MobileSearchBar>

        <Link href={isAuthenticated ? "/wishlist" : "#"}>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center justify-center h-12 w-12 p-1 rounded-lg transition-colors relative ${
              pathname === "/wishlist" ? "text-black bg-gray-100" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Heart className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Wishlist</span>
            {wishlistState.itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500 text-white">
                {wishlistState.itemCount}
              </Badge>
            )}
          </Button>
        </Link>

        <ShoppingCartSheet>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center h-12 w-12 p-1 rounded-lg transition-colors relative text-gray-500 hover:text-gray-700"
          >
            <ShoppingBag className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Cart</span>
            {cartState.itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-black text-white">
                {cartState.itemCount}
              </Badge>
            )}
          </Button>
        </ShoppingCartSheet>
      </div>
    </div>
  );
}
