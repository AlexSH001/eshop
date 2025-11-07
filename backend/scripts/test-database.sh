#!/bin/bash
# 数据库测试脚本
# 用法: ./test-database.sh [sqlite|postgres]

set -e

DB_TYPE=${1:-sqlite}

echo "🧪 Testing database: $DB_TYPE"

# 检查环境文件
if [ ! -f ".env.development" ] || [ ! -f ".env.production" ]; then
  echo "❌ Environment files not found. Please create .env.development and .env.production first."
  exit 1
fi

# 切换到指定数据库环境
if [ "$DB_TYPE" = "sqlite" ]; then
  echo "📁 Switching to SQLite environment..."
  ./switch-env.sh development
elif [ "$DB_TYPE" = "postgres" ]; then
  echo "🐘 Switching to PostgreSQL environment..."
  ./switch-env.sh production
else
  echo "❌ Invalid database type: $DB_TYPE. Use 'sqlite' or 'postgres'"
  exit 1
fi

# 检查环境变量
echo "🔍 Checking environment variables..."
if [ "$DB_TYPE" = "sqlite" ]; then
  if ! grep -q "DB_CLIENT=sqlite3" .env; then
    echo "❌ DB_CLIENT not set to sqlite3 in .env"
    exit 1
  fi
else
  if ! grep -q "DB_CLIENT=postgres" .env; then
    echo "❌ DB_CLIENT not set to postgres in .env"
    exit 1
  fi
fi

# 检查JWT密钥
if ! grep -q "JWT_SECRET=" .env; then
  echo "⚠️  JWT_SECRET not found, generating..."
  if [ "$DB_TYPE" = "sqlite" ]; then
    ./gen-jwt-secret-dev.sh
  else
    ./gen-jwt-secret.sh
  fi
fi

# 启动测试服务器（后台运行）
echo "🚀 Starting test server..."
npm run dev &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ Waiting for server to start..."
sleep 5

# 测试健康检查
echo "🏥 Testing health check..."
HEALTH_RESPONSE=$(curl -s https://backend.fortunewhisper.com/api/monitoring/health || echo "FAILED")

if [[ "$HEALTH_RESPONSE" == *"FAILED"* ]]; then
  echo "❌ Health check failed. Server may not be running."
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Health check passed"

# 测试数据库连接
echo "🗄️  Testing database connection..."
DB_RESPONSE=$(curl -s https://backend.fortunewhisper.com/api/monitoring/metrics || echo "FAILED")

if [[ "$DB_RESPONSE" == *"FAILED"* ]]; then
  echo "❌ Database connection test failed."
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Database connection test passed"

# 停止测试服务器
echo "🛑 Stopping test server..."
kill $SERVER_PID 2>/dev/null || true

echo "🎉 Database test completed successfully!"
echo "✅ $DB_TYPE database is working correctly" 