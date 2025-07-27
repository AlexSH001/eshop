# 购物车持久化功能实现

## 问题描述
用户发现购物车中的商品不会被存储，在其他浏览器上登录后看不到之前加入购物车的产品。

## 解决方案
实现了完整的购物车持久化功能，支持游客购物车和用户购物车的无缝切换。

## 功能特性

### 1. 游客购物车 (Guest Cart)
- 使用 Session ID 标识游客
- 购物车数据存储在数据库中
- 支持跨浏览器会话保持

### 2. 用户购物车 (User Cart)
- 与用户账户关联
- 登录后自动加载用户购物车
- 支持多设备同步

### 3. 购物车合并 (Cart Merge)
- 游客登录后自动合并购物车
- 智能处理重复商品（取最大数量）
- 合并后清除游客会话

## 技术实现

### 后端实现

#### 数据库表结构
```sql
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id),
  UNIQUE(session_id, product_id)
);
```

#### API 端点
- `GET /api/cart` - 获取购物车内容
- `POST /api/cart/items` - 添加商品到购物车
- `PUT /api/cart/items/:itemId` - 更新商品数量
- `DELETE /api/cart/items/:itemId` - 删除购物车商品
- `DELETE /api/cart` - 清空购物车
- `POST /api/cart/merge` - 合并游客购物车到用户购物车
- `GET /api/cart/count` - 获取购物车商品数量

### 前端实现

#### 购物车上下文 (CartContext)
- 自动加载购物车数据
- 监听认证状态变化
- 实时同步购物车状态

#### 认证上下文 (AuthContext)
- 登录/注册后自动合并购物车
- 处理会话ID清理

## 使用流程

### 游客购物流程
1. 游客访问网站，自动生成 Session ID
2. 添加商品到购物车，数据存储到数据库
3. 刷新页面或重新访问，购物车数据保持

### 用户登录流程
1. 游客添加商品到购物车
2. 用户登录/注册
3. 系统自动合并游客购物车到用户购物车
4. 清除游客会话ID
5. 用户购物车在所有设备上同步

### 跨设备同步
1. 用户在任何设备上登录
2. 自动加载用户购物车数据
3. 购物车状态实时同步

## 测试验证

### 后端测试
```bash
cd backend
export DB_CLIENT=sqlite3
node test-cart.js
```

### 前端测试
1. 打开 `frontend/test-cart-integration.html`
2. 测试游客购物车功能
3. 测试用户登录和购物车合并
4. 测试跨浏览器购物车同步

## 配置说明

### 环境变量
```bash
# 数据库类型 (sqlite3 或 postgresql)
DB_CLIENT=sqlite3

# SQLite 数据库路径
DB_PATH=./data/store.db

# PostgreSQL 配置 (如果使用 PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eshop_db
DB_USER=postgres
DB_PASSWORD=password
```

### 数据库初始化
```bash
# 初始化 SQLite 数据库
export DB_CLIENT=sqlite3
node src/database/init.js

# 填充测试数据
node src/database/seed.js
```

## 优势

1. **无缝体验**: 游客和用户购物车无缝切换
2. **数据持久化**: 购物车数据存储在数据库中
3. **跨设备同步**: 用户登录后购物车在所有设备同步
4. **智能合并**: 自动处理重复商品和数量冲突
5. **性能优化**: 使用数据库索引优化查询性能
6. **安全性**: 支持用户认证和会话管理

## 注意事项

1. 确保后端服务器正在运行
2. 数据库需要正确初始化
3. 前端需要正确配置 API 地址
4. 购物车合并功能需要用户登录

## 故障排除

### 常见问题
1. **购物车数据丢失**: 检查数据库连接和表结构
2. **合并失败**: 检查用户认证状态和会话ID
3. **API 错误**: 检查后端服务器状态和日志

### 调试方法
1. 检查浏览器开发者工具的网络请求
2. 查看后端服务器日志
3. 使用测试脚本验证功能
4. 检查数据库中的数据状态 