#!/bin/sh

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

# Seed database with demo data (only in demo/development environments)
# Only seeds if NODE_ENV is "demo" or "development" AND SEED_DEMO_DATA=true
if [ "$NODE_ENV" = "demo" ] || [ "$NODE_ENV" = "development" ]; then
    if [ "$SEED_DEMO_DATA" = "true" ]; then
        echo ""
        echo "🌱 Seeding database with demo data (NODE_ENV=$NODE_ENV, SEED_DEMO_DATA=true)..."
        npm run seed
        
        if [ $? -ne 0 ]; then
            echo "❌ Failed to seed database"
            exit 1
        fi
    else
        echo ""
        echo "⏭️  Skipping database seeding (set SEED_DEMO_DATA=true to enable in demo/development)"
        echo "   💡 Your existing database data will be preserved"
    fi
else
    echo ""
    echo "⏭️  Skipping database seeding (only available in demo/development environments)"
    echo "   💡 Production environments never seed automatically to protect data"
fi

echo ""
echo "✅ Backend initialization completed successfully!"
echo ""
echo "🔑 Test Credentials:"
echo "   User: user@eshop.com / user123"
echo "   Admin: admin@eshop.com / admin123"
echo "   Super Admin: superadmin@eshop.com / superadmin123"
echo ""
echo "📚 API Documentation:"
echo "   Base URL: http://${BACKEND_API_URL}"
echo "   Health Check: http://${BACKEND_API_URL}/health"
echo ""

exec npm start