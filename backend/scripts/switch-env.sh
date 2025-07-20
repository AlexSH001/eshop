#!/bin/bash
# 用法: ./switch-env.sh development|production
set -e
if [ "$1" = "development" ]; then
  cp .env.development .env
  echo "已切换到开发环境配置 (.env.development)"
elif [ "$1" = "production" ]; then
  cp .env.production .env
  echo "已切换到生产环境配置 (.env.production)"
else
  echo "用法: $0 development|production"
  exit 1
fi 