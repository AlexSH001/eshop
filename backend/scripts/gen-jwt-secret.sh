#!/bin/bash
# 自动生成强随机JWT密钥并写入.env.production
set -e

# 生成密钥
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 检查.env.production是否存在
if [ ! -f .env.production ]; then
  echo ".env.production 文件不存在，请先创建基础配置。"
  exit 1
fi

# 用sed替换或追加密钥
if grep -q '^JWT_SECRET=' .env.production; then
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
else
  echo "JWT_SECRET=$JWT_SECRET" >> .env.production
fi

if grep -q '^JWT_REFRESH_SECRET=' .env.production; then
  sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env.production
else
  echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env.production
fi

echo "已自动生成并写入强随机JWT密钥到 .env.production："
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" 