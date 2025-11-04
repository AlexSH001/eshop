#!/bin/bash

echo "🚀 Starting eshop Application..."

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
NEXT_PUBLIC_APP_NAME=eshop
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo "✅ Created .env.local"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install


# Create data directory
mkdir -p data
mkdir -p uploads

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "Frontend: npm run"
echo ""
echo "The application will be available at:"
echo "- Frontend: http://localhost:3000"
echo ""