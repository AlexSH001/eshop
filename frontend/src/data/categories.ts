// Centralized category data

import { Smartphone, ShoppingBag, Home as HomeIcon, Gamepad2, Dumbbell, Camera, Book, Car, Music, Baby } from "lucide-react";

export const allCategories = [
  {
    name: "Electronics",
    icon: Smartphone,
    description: "Phones, Laptops, Gadgets",
    href: "/categories/electronics",
    productCount: 12,
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop"
  },
  {
    name: "Fashion",
    icon: ShoppingBag,
    description: "Clothing, Shoes, Accessories",
    href: "/categories/fashion",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
  },
  {
    name: "Home & Garden",
    icon: HomeIcon,
    description: "Furniture, Decor, Tools",
    href: "/categories/home-garden",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop"
  },
  {
    name: "Gaming",
    icon: Gamepad2,
    description: "Consoles, Games, Accessories",
    href: "/categories/gaming",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop"
  },
  {
    name: "Sports",
    icon: Dumbbell,
    description: "Fitness, Camping, Sports",
    href: "/categories/sports",
    productCount: 6,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop"
  },
  {
    name: "Photography",
    icon: Camera,
    description: "Cameras, Lenses, Equipment",
    href: "/categories/photography",
    productCount: 5,
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop"
  },
  {
    name: "Books",
    icon: Book,
    description: "Books, Movies, Music",
    href: "/categories/books",
    productCount: 4,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop"
  },
  {
    name: "Automotive",
    icon: Car,
    description: "Parts, Accessories, Tools",
    href: "/categories/automotive",
    productCount: 6,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop"
  },
  {
    name: "Music",
    icon: Music,
    description: "Instruments, Audio, Equipment",
    href: "/categories/music",
    productCount: 5,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop"
  },
  {
    name: "Baby & Kids",
    icon: Baby,
    description: "Toys, Clothes, Safety",
    href: "/categories/baby-kids",
    productCount: 7,
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop"
  }
]; 