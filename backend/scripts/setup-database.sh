#!/bin/bash
# 数据库设置脚本
# 用法: ./scripts/setup-database.sh [sqlite|postgres] [migrate|seed|reset]

set -e

DB_TYPE=${1:-sqlite}
ACTION=${2:-migrate}

echo "🔧 Setting up database: $DB_TYPE with action: $ACTION"

# 检查环境文件是否存在
if [ ! -f ".env.development" ]; then
  echo "❌ .env.development file not found. Please create it first."
  exit 1
fi

if [ ! -f ".env.production" ]; then
  echo "❌ .env.production file not found. Please create it first."
  exit 1
fi

# 根据数据库类型切换环境
if [ "$DB_TYPE" = "sqlite" ]; then
  echo "📁 Switching to SQLite environment..."
  ./scripts/switch-env.sh development
  
  # 生成JWT密钥（如果需要）
  if ! grep -q "JWT_SECRET=" .env; then
    echo "🔑 Generating JWT secrets for development..."
    ./scripts/gen-jwt-secret-dev.sh
  fi
  
elif [ "$DB_TYPE" = "postgres" ]; then
  echo "🐘 Switching to PostgreSQL environment..."
  ./scripts/switch-env.sh production
  
  # 生成JWT密钥（如果需要）
  if ! grep -q "JWT_SECRET=" .env; then
    echo "🔑 Generating JWT secrets for production..."
    ./scripts/gen-jwt-secret.sh
  fi
  
  echo "⚠️  Please ensure PostgreSQL is running and configured in .env.production"
else
  echo "❌ Invalid database type: $DB_TYPE. Use 'sqlite' or 'postgres'"
  exit 1
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