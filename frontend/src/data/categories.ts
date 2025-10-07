// Centralized category data

import { Smartphone, ShoppingBag, Home as HomeIcon, Gamepad2, Dumbbell, Camera, Book, Car, Music, Baby } from "lucide-react";

export const allCategories = [
  {
    name: "Electronics",
    icon: Smartphone,
    description: "Phones, Laptops, Gadgets",
    href: "/categories/electronics",
    productCount: 12,
    image: "/static/images/categories/category_electronics.jpg"
  },
  {
    name: "Fashion",
    icon: ShoppingBag,
    description: "Clothing, Shoes, Accessories",
    href: "/categories/fashion",
    productCount: 8,
    image: "/static/images/categories/category_fashion.jpg"
  },
  {
    name: "Home & Garden",
    icon: HomeIcon,
    description: "Furniture, Decor, Tools",
    href: "/categories/home-garden",
    productCount: 8,
    image: "/static/images/categories/category_home_garden.jpg"
  },
  {
    name: "Gaming",
    icon: Gamepad2,
    description: "Consoles, Games, Accessories",
    href: "/categories/gaming",
    productCount: 8,
    image: "/static/images/categories/category_gaming.jpg"
  },
  {
    name: "Sports",
    icon: Dumbbell,
    description: "Fitness, Camping, Sports",
    href: "/categories/sports",
    productCount: 6,
    image: "/static/images/categories/category_sports.jpg"
  },
  {
    name: "Photography",
    icon: Camera,
    description: "Cameras, Lenses, Equipment",
    href: "/categories/photography",
    productCount: 5,
    image: "/static/images/categories/category_photography.jpg"
  },
  {
    name: "Books",
    icon: Book,
    description: "Books, Movies, Music",
    href: "/categories/books",
    productCount: 4,
    image: "/static/images/categories/category_books.jpg"
  },
  {
    name: "Automotive",
    icon: Car,
    description: "Parts, Accessories, Tools",
    href: "/categories/automotive",
    productCount: 6,
    image: "/static/images/categories/category_automotive.jpg"
  },
  {
    name: "Music",
    icon: Music,
    description: "Instruments, Audio, Equipment",
    href: "/categories/music",
    productCount: 5,
    image: "/static/images/categories/category_music.jpg"
  },
  {
    name: "Baby & Kids",
    icon: Baby,
    description: "Toys, Clothes, Safety",
    href: "/categories/baby-kids",
    productCount: 7,
    image: "/static/images/categories/category_music.jpg"
  }
]; 

export const bannerSlides = [
  {
    id: 1,
    title: "Summer Sale",
    subtitle: "Up to 70% off on all electronics",
    image: "/static/images/banners/banner_1.jpg",
    cta: "Shop Electronics",
    link: "/categories/electronics"
  },
  {
    id: 2,
    title: "New Fashion Collection",
    subtitle: "Discover the latest trends",
    image: "/static/images/banners/banner_2.jpg",
    cta: "Shop Fashion",
    link: "/categories/fashion"
  },
  {
    id: 3,
    title: "Home & Garden Sale",
    subtitle: "Transform your living space",
    image: "/static/images/banners/banner_3.jpg",
    cta: "Shop Home",
    link: "/categories/home-garden"
  },
  {
    id: 4,
    title: "Gaming Gear",
    subtitle: "Level up your gaming experience",
    image: "/static/images/banners/banner_4.jpg",
    cta: "Shop Gaming",
    link: "/categories/gaming"
  }
];