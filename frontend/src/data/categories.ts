// Centralized category data

import { Smartphone, ShoppingBag, Home as HomeIcon, Gamepad2, Dumbbell, Camera, Book, Car, Music, Baby } from "lucide-react";

export const allCategories = [
  {
    id: 1,
    name: "Electronics",
    icon: Smartphone,
    description: "Phones, Laptops, Gadgets",
    href: "/categories/electronics",
    image: "/static/images/categories/category_electronics.jpg"
  },
  {
    id: 2,
    name: "Fashion",
    icon: ShoppingBag,
    description: "Clothing, Shoes, Accessories",
    href: "/categories/fashion",
    image: "/static/images/categories/category_fashion.jpg"
  },
  {
    id: 3,
    name: "Home & Garden",
    icon: HomeIcon,
    description: "Furniture, Decor, Tools",
    href: "/categories/home-garden",
    image: "/static/images/categories/category_home_garden.jpg"
  },
  {
    id: 4,
    name: "Gaming",
    icon: Gamepad2,
    description: "Consoles, Games, Accessories",
    href: "/categories/gaming",
    image: "/static/images/categories/category_gaming.jpg"
  },
  {
    id: 5,
    name: "Sports",
    icon: Dumbbell,
    description: "Fitness, Camping, Sports",
    href: "/categories/sports",
    image: "/static/images/categories/category_sports.jpg"
  },
  {
    id: 6,
    name: "Photography",
    icon: Camera,
    description: "Cameras, Lenses, Equipment",
    href: "/categories/photography",
    image: "/static/images/categories/category_photography.jpg"
  },
  {
    id: 7,
    name: "Books",
    icon: Book,
    description: "Books, Movies, Music",
    href: "/categories/books",
    image: "/static/images/categories/category_books.jpg"
  },
  {
    id: 8,
    name: "Automotive",
    icon: Car,
    description: "Parts, Accessories, Tools",
    href: "/categories/automotive",
    image: "/static/images/categories/category_automotive.jpg"
  },
  {
    id: 9,
    name: "Music",
    icon: Music,
    description: "Instruments, Audio, Equipment",
    href: "/categories/music",
    image: "/static/images/categories/category_music.jpg"
  },
  {
    id: 10,
    name: "Baby & Kids",
    icon: Baby,
    description: "Toys, Clothes, Safety",
    href: "/categories/baby-kids",
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