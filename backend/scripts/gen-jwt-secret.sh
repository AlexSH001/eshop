#!/bin/bash
# 自动生成强随机JWT密钥并写入.env
set -e

# 生成密钥
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 检查.env是否存在
if [ ! -f .env ]; then
  echo ".env 文件不存在，请先创建基础配置。"
  exit 1
fi

# 用sed替换或追加密钥
if grep -q '^JWT_SECRET=' .env; then
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
else
  echo "JWT_SECRET=$JWT_SECRET" >> .env
fi

if grep -q '^JWT_REFRESH_SECRET=' .env; then
  sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
else
  echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env
fi

echo "已自动生成并写入强随机JWT密钥到 .env"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" 