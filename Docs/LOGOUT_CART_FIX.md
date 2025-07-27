# 登出后购物车状态同步问题修复

## 问题描述
用户在登录状态下加入产品到购物车后，购物车图标会显示正确的商品数量。但当用户登出后，购物车图标仍然显示之前的数量，但实际去操作购物车时会显示"产品不存在"的错误。

## 问题原因
1. **状态同步问题**: 用户登出时，前端的购物车状态没有正确更新
2. **事件监听缺失**: 购物车上下文没有正确监听登出事件
3. **缓存状态**: 前端缓存了用户购物车状态，登出后没有清除

## 解决方案

### 1. 修改认证上下文 (AuthContext)

#### 登出函数改进
```typescript
const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('wishlist');
  
  // 触发自定义登出事件
  window.dispatchEvent(new CustomEvent('logout'));
  
  // 触发存储事件通知购物车上下文
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'auth_token',
    newValue: null,
    oldValue: localStorage.getItem('auth_token')
  }));
  
  setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
};
```

### 2. 修改购物车上下文 (CartContext)

#### 事件监听改进
```typescript
useEffect(() => {
  const loadCart = async () => {
    // ... 加载购物车逻辑
  };

  loadCart();

  // 监听认证状态变化
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'auth_token' || e.key === 'session_id') {
      // 添加延迟确保localStorage已更新
      setTimeout(loadCart, 100);
    }
  };

  // 监听自定义登出事件
  const handleLogout = () => {
    // 立即清除购物车状态
    dispatch({ type: 'SET_CART', payload: [] });
    // 然后重新加载游客购物车
    setTimeout(loadCart, 100);
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('logout', handleLogout);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('logout', handleLogout);
  };
}, []);
```

#### 错误处理改进
```typescript
if (response.ok) {
  const data = await response.json();
  const items = data.items?.map(/* ... */) || [];
  dispatch({ type: 'SET_CART', payload: items });
} else {
  // 请求失败时清除购物车状态
  dispatch({ type: 'SET_CART', payload: [] });
}
```

## 修复效果

### 修复前的问题
1. 用户登录后添加商品到购物车
2. 购物车图标显示正确数量
3. 用户登出后，购物车图标仍显示之前数量
4. 点击购物车时显示"产品不存在"错误

### 修复后的行为
1. 用户登录后添加商品到购物车
2. 购物车图标显示正确数量
3. 用户登出后，购物车图标立即更新为0
4. 系统自动切换到游客购物车模式
5. 游客购物车数据正确显示

## 技术细节

### 事件机制
- **CustomEvent**: 使用自定义`logout`事件确保购物车上下文立即响应
- **StorageEvent**: 监听localStorage变化，处理跨标签页同步
- **延迟加载**: 使用`setTimeout`确保状态更新完成后再加载新数据

### 状态管理
- **立即清除**: 登出时立即清除购物车状态，避免显示错误数据
- **重新加载**: 清除后重新加载游客购物车数据
- **错误处理**: API请求失败时自动清除状态

### 用户体验
- **即时反馈**: 登出后购物车图标立即更新
- **无缝切换**: 游客和用户购物车无缝切换
- **数据一致性**: 确保显示的数据与实际购物车内容一致

## 测试验证

### 后端测试
```bash
cd backend
export DB_CLIENT=sqlite3
node test-logout-cart.js
```

### 前端测试
1. 打开 `frontend/test-logout-cart.html`
2. 测试登录、添加商品、登出流程
3. 验证购物车状态正确更新

### 测试场景
1. **登录添加商品**: 验证用户购物车功能
2. **登出状态检查**: 验证购物车图标更新
3. **游客购物车**: 验证游客购物车功能
4. **跨浏览器测试**: 验证状态同步

## 注意事项

1. **事件监听**: 确保正确添加和移除事件监听器
2. **状态同步**: 使用延迟确保状态更新完成
3. **错误处理**: 网络请求失败时提供合理的降级处理
4. **性能优化**: 避免频繁的状态更新和API调用

## 相关文件

- `frontend/src/contexts/AuthContext.tsx` - 认证上下文
- `frontend/src/contexts/CartContext.tsx` - 购物车上下文
- `frontend/test-logout-cart.html` - 前端测试页面
- `backend/test-logout-cart.js` - 后端测试脚本

## 总结

通过改进事件监听机制和状态管理，成功解决了登出后购物车状态同步问题。现在用户登出后，购物车图标会立即更新为正确的状态，确保用户体验的一致性和数据的准确性。 