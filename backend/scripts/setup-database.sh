#!/bin/bash
# 数据库设置脚本
# 用法: ./scripts/setup-database.sh [sqlite|postgres] [migrate|seed|reset]

set -e

DB_TYPE=${1:-sqlite}
ACTION=${2:-migrate}

echo "🔧 Setting up database: $DB_TYPE with action: $ACTION"

# 检查环境文件是否存在
if [ ! -f ".env" ]; then
  echo "❌ .env file not found. Please create it first."
  exit 1
fi

# 生成JWT密钥（如果需要）
if ! grep -q "JWT_SECRET=" .env; then
  echo "🔑 Generating JWT secrets..."
  ./scripts/gen-jwt-secret.sh
fi
  
# 执行数据库操作
case $ACTION in
  "migrate")
    echo "📋 Running database migration..."
    npm run migrate
    ;;
  "seed")
    echo "🌱 Seeding database with sample data..."
    npm run seed
    ;;
  "reset")
    echo "🔄 Resetting database (migrate + seed)..."
    npm run migrate
    npm run seed
    ;;
  *)
    echo "❌ Invalid action: $ACTION. Use 'migrate', 'seed', or 'reset'"
    exit 1
    ;;
esac

echo "✅ Database setup completed successfully!"
echo "🚀 You can now start the server with: npm run dev" 