export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  status: 'active' | 'inactive'
  image?: string
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  products: OrderItem[]
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shippingAddress: Address
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

export interface Address {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
}
