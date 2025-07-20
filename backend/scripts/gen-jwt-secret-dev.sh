#!/bin/bash
# 自动生成强随机JWT密钥并写入.env.development
set -e

# 生成密钥
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 检查.env.development是否存在
if [ ! -f .env.development ]; then
  echo ".env.development 文件不存在，请先创建基础配置。"
  exit 1
fi

# 用sed替换或追加密钥
if grep -q '^JWT_SECRET=' .env.development; then
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.development
else
  echo "JWT_SECRET=$JWT_SECRET" >> .env.development
fi

if grep -q '^JWT_REFRESH_SECRET=' .env.development; then
  sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env.development
else
  echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env.development
fi

echo "已自动生成并写入强随机JWT密钥到 .env.development："
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" 