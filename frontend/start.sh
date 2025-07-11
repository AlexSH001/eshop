#!/bin/bash

echo "🚀 Starting Commodity Store Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Create environment files if they don't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Commodity Store
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo "✅ Created .env.local"
fi

# Check if backend .env exists
if [ ! -f "../backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cat > ../backend/.env << EOF
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DB_PATH=./data/store.db

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# JWT Expiration (in seconds)
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
EOF
    echo "✅ Created backend .env"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd ../backend
npm install

# Create data directory
mkdir -p data
mkdir -p uploads

# Initialize database
echo "🗄️  Initializing database..."
npm run migrate
npm run seed

# Go back to root
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Terminal 1 (Backend): cd ../backend && npm run dev"
echo "2. Terminal 2 (Frontend): npm run dev"
echo ""
echo "The application will be available at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:3001/api"
echo ""
echo "Test credentials:"
echo "- User: user@example.com / password123"
echo "- Admin: admin@shop.com / admin123" 