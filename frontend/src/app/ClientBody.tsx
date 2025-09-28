"use client";

import { useEffect } from "react";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { CategoriesProvider } from "@/contexts/CategoriesContext";


export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <AuthProvider>
      <AdminProvider>
        <CategoriesProvider>
          <WishlistProvider>
            <SearchProvider>
              <CartProvider>
                <div className="antialiased">
                  {children}
                </div>
              </CartProvider>
            </SearchProvider>
          </WishlistProvider>
        </CategoriesProvider>
      </AdminProvider>
    </AuthProvider>
  );
}
