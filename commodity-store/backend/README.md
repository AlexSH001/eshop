# Commodity Store Backend API

A comprehensive e-commerce backend built with Node.js, Express, and SQLite. This API supports user authentication, product management, shopping cart, orders, wishlists, and admin functionality.

## 🚀 Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Product Management**: Full CRUD operations with search and filtering
- **Shopping Cart**: Persistent cart with guest and authenticated user support
- **Order Processing**: Complete order management with status tracking
- **Wishlist**: User wishlist functionality
- **Admin Dashboard**: Administrative panel with analytics and management tools
- **File Upload**: Image upload for products and avatars
- **Search**: Advanced product search with suggestions and filters
- **Security**: Rate limiting, input validation, and secure password hashing

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

## ⚡ Quick Start

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize Database**
   ```bash
   npm run migrate
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **API Base URL**
   ```
   http://localhost:3001/api
   ```

## 🗃 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `admins` - Administrative users
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `cart_items` - Shopping cart persistence
- `wishlist_items` - User wishlists
- `search_history` - Search analytics

### Support Tables
- `user_addresses` - Saved addresses
- `product_reviews` - Product ratings and reviews
- `email_tokens` - Email verification tokens

## 🔐 Authentication

### User Authentication
```bash
# Register
POST /api/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "password123"
}

# Get Current User
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Admin Authentication
```bash
# Admin Login
POST /api/auth/admin/login
Content-Type: application/json
{
  "email": "admin@shop.com",
  "password": "admin123"
}
```

### Test Credentials
- **User**: `user@example.com` / `password123`
- **Admin**: `admin@shop.com` / `admin123`
- **Super Admin**: `superadmin@shop.com` / `super123`

## 📝 API Endpoints

### Products
```bash
# Get all products (with filtering)
GET /api/products?page=1&limit=20&category=1&search=laptop

# Get single product
GET /api/products/:id

# Get products by category
GET /api/products/category/:categoryId

# Get featured products
GET /api/products/featured/list

# Admin: Create product
POST /api/products
Authorization: Bearer <admin_token>

# Admin: Update product
PUT /api/products/:id
Authorization: Bearer <admin_token>

# Admin: Delete product
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

### Shopping Cart
```bash
# Get cart contents
GET /api/cart
X-Session-ID: <session_id> (for guest users)
Authorization: Bearer <access_token> (for authenticated users)

# Add item to cart
POST /api/cart/items
Content-Type: application/json
{
  "productId": 1,
  "quantity": 2
}

# Update cart item
PUT /api/cart/items/:itemId
Content-Type: application/json
{
  "quantity": 3
}

# Remove item from cart
DELETE /api/cart/items/:itemId

# Clear cart
DELETE /api/cart

# Merge guest cart with user cart (after login)
POST /api/cart/merge
Content-Type: application/json
{
  "sessionId": "guest_session_id"
}
```

### Orders
```bash
# Create order (checkout)
POST /api/orders
Authorization: Bearer <access_token> (optional)
Content-Type: application/json
{
  "email": "customer@example.com",
  "paymentMethod": "credit_card",
  "billingAddress": { ... },
  "shippingAddress": { ... }
}

# Get user's orders
GET /api/orders/my-orders
Authorization: Bearer <access_token>

# Get single order
GET /api/orders/:id

# Admin: Get all orders
GET /api/orders
Authorization: Bearer <admin_token>

# Admin: Update order status
PUT /api/orders/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json
{
  "status": "shipped",
  "trackingNumber": "1234567890"
}
```

### Wishlist
```bash
# Get user's wishlist
GET /api/wishlist
Authorization: Bearer <access_token>

# Add product to wishlist
POST /api/wishlist/items/:productId
Authorization: Bearer <access_token>

# Remove product from wishlist
DELETE /api/wishlist/items/:productId
Authorization: Bearer <access_token>

# Check if product is in wishlist
GET /api/wishlist/check/:productId
Authorization: Bearer <access_token>
```

### Search
```bash
# Search products
GET /api/search?q=laptop&category=1&minPrice=100&maxPrice=1000

# Get search suggestions
GET /api/search/suggestions?q=lap

# Get popular search terms
GET /api/search/popular

# Get user's recent searches
GET /api/search/recent
Authorization: Bearer <access_token>
```

### Admin Dashboard
```bash
# Dashboard statistics
GET /api/admin/dashboard/stats
Authorization: Bearer <admin_token>

# Recent orders
GET /api/admin/dashboard/recent-orders
Authorization: Bearer <admin_token>

# Top products
GET /api/admin/dashboard/top-products
Authorization: Bearer <admin_token>

# User management
GET /api/admin/users
Authorization: Bearer <admin_token>

# Admin management (Super Admin only)
GET /api/admin/admins
Authorization: Bearer <super_admin_token>
```

### File Upload
```bash
# Upload product image
POST /api/upload/product-image
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
form-data: image=<file>

# Upload multiple product images
POST /api/upload/product-images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
form-data: images=<files>

# Upload avatar
POST /api/upload/avatar
Content-Type: multipart/form-data
form-data: avatar=<file>
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DB_PATH=./data/store.db
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### Database Configuration

The API uses SQLite for simplicity and portability. The database file is created automatically at the path specified in `DB_PATH`.

## 📊 Database Management

### Scripts
```bash
# Initialize database schema
npm run migrate

# Seed database with sample data
npm run seed

# Reset database (migrate + seed)
npm run reset
```

### Manual Database Operations
```bash
# Access SQLite CLI
sqlite3 data/store.db

# View tables
.tables

# Describe table structure
.schema products
```

## 🛡 Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Access and refresh token system
- **Rate Limiting**: Per-IP request limiting
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Security Headers**: Helmet.js security headers
- **File Upload Security**: Type and size validation

## 📈 Analytics & Monitoring

### Health Check
```bash
GET /api/health
```

### Admin System Health
```bash
GET /api/admin/system/health
Authorization: Bearer <admin_token>
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<strong-production-secret>
   JWT_REFRESH_SECRET=<strong-production-refresh-secret>
   ```

2. **Database Setup**
   ```bash
   npm run migrate
   npm run seed
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

### API Testing with curl
```bash
# Health check
curl http://localhost:3001/api/health

# Get products
curl http://localhost:3001/api/products

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Testing with Postman

Import the API endpoints into Postman:
1. Create a new collection
2. Add environment variables for `base_url` and `auth_token`
3. Set up requests with proper headers and authentication

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check if the data directory exists
   - Verify DB_PATH in environment variables
   - Run migration script

2. **Authentication Errors**
   - Verify JWT secrets are set
   - Check token expiration
   - Ensure proper Authorization header format

3. **File Upload Errors**
   - Check upload directory permissions
   - Verify file size limits
   - Ensure multer configuration

4. **CORS Errors**
   - Verify FRONTEND_URL in environment
   - Check CORS configuration in index.js

## 📚 API Documentation

### Response Format

**Success Response:**
```json
{
  "message": "Success message",
  "data": { ... },
  "pagination": { ... } // for paginated responses
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": [ ... ] // validation errors
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Happy coding! 🚀**
