# withAuth 中间件修复总结

## 🎯 问题描述
在使用 `withAuth` 中间件的 API 路由中，当需要访问 `params` 参数时出现错误：
```
TypeError: Cannot destructure property 'params' of 'undefined' as it is undefined.
```

## 🔍 根本原因
`withAuth` 中间件只接受一个参数（`AuthenticatedRequest`），但 Next.js 的 API 路由处理函数需要接受两个参数：
1. `request` - 请求对象
2. `context` - 包含 `params` 等上下文信息

## ✅ 修复方案

### 修改 `withAuth` 中间件 (`lib/auth-middleware.ts`)

**修复前**:
```typescript
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // ... 认证逻辑
    return handler(authenticatedRequest)
  }
}
```

**修复后**:
```typescript
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    // ... 认证逻辑
    return handler(authenticatedRequest, context)
  }
}
```

## 🔧 关键变更

1. **函数签名更新**: 
   - 处理函数现在接受可选的 `context` 参数
   - 返回的包装函数也接受可选的 `context` 参数

2. **参数传递**: 
   - 将 `context` 参数正确传递给原始处理函数
   - 保持向后兼容性（`context` 是可选的）

## 🎯 影响的 API 路由

以下 API 路由使用了 `params` 参数，现在应该能正常工作：

1. **`/api/db/food-entry/[id]`**
   - `GET` - 获取单个食物记录
   - `PUT` - 更新食物记录
   - `DELETE` - 删除食物记录

2. **`/api/db/exercise-entry/[id]`**
   - `GET` - 获取单个运动记录
   - `PUT` - 更新运动记录
   - `DELETE` - 删除运动记录

## 🧪 测试验证

### 测试用例
```typescript
// 示例：更新食物记录
PUT /api/db/food-entry/cmcof66ho000au5owtvmcl3rm
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "foodName": "鸡蛋",
  "consumedGrams": 51,
  "mealType": "snack",
  // ... 其他字段
}
```

### 预期结果
- ✅ 不再出现 `params` 解构错误
- ✅ 能够正确获取路由参数中的 `id`
- ✅ API 调用返回正确的响应

## 🔄 向后兼容性

修复保持了向后兼容性：
- 不使用 `params` 的 API 路由继续正常工作
- `context` 参数是可选的，不会影响现有代码

## 🎉 修复完成

`withAuth` 中间件现在能够正确处理需要 `params` 参数的 API 路由，解决了食物和运动记录更新时的 500 错误问题。
