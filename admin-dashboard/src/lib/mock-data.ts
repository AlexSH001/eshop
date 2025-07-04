import type { Product, Order, DashboardStats } from '@/types'

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 199.99,
    category: 'Electronics',
    stock: 45,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    name: 'Smart Fitness Watch',
    description: 'Advanced fitness tracking with heart rate monitor',
    price: 299.99,
    category: 'Electronics',
    stock: 23,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
    createdAt: '2024-01-12T09:15:00Z',
    updatedAt: '2024-01-18T11:45:00Z'
  },
  {
    id: '3',
    name: 'Organic Cotton T-Shirt',
    description: 'Comfortable organic cotton t-shirt in various colors',
    price: 29.99,
    category: 'Clothing',
    stock: 120,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-22T16:20:00Z'
  },
  {
    id: '4',
    name: 'Premium Coffee Beans',
    description: 'Single-origin arabica coffee beans, freshly roasted',
    price: 24.99,
    category: 'Food & Beverage',
    stock: 0,
    status: 'inactive',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    createdAt: '2024-01-08T12:30:00Z',
    updatedAt: '2024-01-25T09:10:00Z'
  },
  {
    id: '5',
    name: 'Leather Laptop Bag',
    description: 'Handcrafted leather laptop bag for professionals',
    price: 159.99,
    category: 'Accessories',
    stock: 18,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    createdAt: '2024-01-05T15:45:00Z',
    updatedAt: '2024-01-19T13:25:00Z'
  }
]

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    products: [
      { productId: '1', productName: 'Wireless Bluetooth Headphones', quantity: 1, price: 199.99 },
      { productId: '3', productName: 'Organic Cotton T-Shirt', quantity: 2, price: 29.99 }
    ],
    total: 259.97,
    status: 'delivered',
    shippingAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA'
    },
    paymentMethod: 'Credit Card',
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-25T10:15:00Z'
  },
  {
    id: 'ORD-002',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.johnson@email.com',
    products: [
      { productId: '2', productName: 'Smart Fitness Watch', quantity: 1, price: 299.99 }
    ],
    total: 299.99,
    status: 'shipped',
    shippingAddress: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'USA'
    },
    paymentMethod: 'PayPal',
    createdAt: '2024-01-22T09:45:00Z',
    updatedAt: '2024-01-26T16:20:00Z'
  },
  {
    id: 'ORD-003',
    customerName: 'Mike Davis',
    customerEmail: 'mike.davis@email.com',
    products: [
      { productId: '5', productName: 'Leather Laptop Bag', quantity: 1, price: 159.99 },
      { productId: '4', productName: 'Premium Coffee Beans', quantity: 3, price: 24.99 }
    ],
    total: 234.96,
    status: 'processing',
    shippingAddress: {
      street: '789 Pine St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'USA'
    },
    paymentMethod: 'Credit Card',
    createdAt: '2024-01-24T11:20:00Z',
    updatedAt: '2024-01-26T08:45:00Z'
  },
  {
    id: 'ORD-004',
    customerName: 'Emily Wilson',
    customerEmail: 'emily.wilson@email.com',
    products: [
      { productId: '3', productName: 'Organic Cotton T-Shirt', quantity: 4, price: 29.99 }
    ],
    total: 119.96,
    status: 'pending',
    shippingAddress: {
      street: '321 Elm St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'USA'
    },
    paymentMethod: 'Debit Card',
    createdAt: '2024-01-26T16:30:00Z',
    updatedAt: '2024-01-26T16:30:00Z'
  }
]

export const mockStats: DashboardStats = {
  totalProducts: mockProducts.length,
  totalOrders: mockOrders.length,
  totalRevenue: mockOrders.reduce((sum, order) => sum + order.total, 0),
  pendingOrders: mockOrders.filter(order => order.status === 'pending').length
}

export const getProducts = (): Product[] => mockProducts
export const getOrders = (): Order[] => mockOrders
export const getStats = (): DashboardStats => mockStats

export const getProductById = (id: string): Product | undefined =>
  mockProducts.find(product => product.id === id)

export const getOrderById = (id: string): Order | undefined =>
  mockOrders.find(order => order.id === id)
