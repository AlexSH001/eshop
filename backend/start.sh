#!/bin/bash

# eshop Backend Startup Script

echo "🚀 eshop Backend Initialization"
echo "========================================"
echo "📊 Environment: $NODE_ENV"
echo "🗄️ Database: $DB_CLIENT"
echo "📁 Data directory: /app/data"
echo "📁 Uploads directory: /app/uploads"
echo "📁 Logs directory: /app/logs"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create data directory
mkdir -p data
mkdir -p uploads/products
mkdir -p uploads/avatars
mkdir -p uploads/misc

echo ""
echo "🗄️  Initializing database..."

# Initialize database
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to initialize database"
    exit 1
fi

# Seed database with sample data
echo ""
echo "🌱 Seeding database with sample data..."
npm run seed

if [ $? -ne 0 ]; then
    echo "❌ Failed to seed database"
    exit 1
fi

echo ""
echo "✅ Backend initialization completed successfully!"
echo ""
echo "🔑 Test Credentials:"
echo "   User: user@eshop.com / password123"
echo "   Admin: admin@eshop.com / admin123"
echo "   Super Admin: superadmin@eshop.com / super123"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "📚 API Documentation:"
echo "   Base URL: http://localhost:3001/api"
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "Happy coding! 🎉"
