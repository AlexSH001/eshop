#!/bin/sh

echo "🚀 Starting E-Shop Frontend..."
echo "📊 Environment: $NODE_ENV"
echo "🌐 Port: $PORT"
echo "🏠 Hostname: $HOSTNAME"
echo "🔗 API URL: $NEXT_PUBLIC_API_URL"
echo "🏪 App URL: $NEXT_PUBLIC_APP_URL"

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
NEXT_PUBLIC_API_URL=https://backend.fortunewhisper.com/api
NEXT_PUBLIC_APP_NAME=eshop
NEXT_PUBLIC_APP_URL=https://www.fortunewhisper.com
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
echo "- Frontend: https://www.fortunewhisper.com"
echo ""
# exec node server.js
exec npm start