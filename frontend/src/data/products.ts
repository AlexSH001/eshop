// Centralized product data for all categories
import { fetchGroupedProducts } from "@/lib/utils";

const products = fetchGroupedProducts()

export const electronicsProducts = products.Electronics

export const fashionProducts = products.Fashion

export const homeGardenProducts = products["Home & Garden"]

export const gamingProducts = products.Gaming

export const sportsProducts = products.Sports
