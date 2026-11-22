# WeChat 集成配置指南

## 概述

本项目已完成 **WeChat API 集成**的完整实现，包括：

- ✅ Access Token 获取
- ✅ 保存为草稿
- ✅ 发布文章
- ✅ 获取发布历史
- ✅ 完整的发布工作流（创建 → 审核 → 发布）

## 🔄 架构设计：Mock ↔ Real 灵活切换

```
┌─────────────────────────────────────────┐
│   业务逻辑层                            │
│  (PublishManager, PublishService)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   适配器层 (Adapter Pattern)            │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Mock       │  │   Real       │    │
│  │  Adapter     │  │  Adapter     │    │
│  └──────────────┘  └──────────────┘    │
└──────────────┬──────────────────────────┘
               │ (通过环境变量切换)
               ▼
┌──────────────────────────────────────────┐
│   微信 API                               │
│   https://api.weixin.qq.com             │
└──────────────────────────────────────────┘
```

## 📋 快速开始

### 1. **开发模式（Mock API）**

无需配置，直接运行演示：

```bash
# 查看完整的发布工作流演示
npm run demo:publish

# 输出：
# ✓ 创建发布记录
# ✓ 提交审核
# ✓ 审核通过
# ✓ 发布到微信
# ✓ 查看发布历史
```

### 2. **生产模式（真实 API）**

#### Step 1: 配置凭证

编辑 `.env` 文件：

```env
# 从微信公众号后台获取
WECHAT_APP_ID=your_app_id_here
WECHAT_APP_SECRET=your_app_secret_here

# 切换到真实 API（开发时使用 mock）
WECHAT_ADAPTER=real
```

#### Step 2: 验证 API 可用性

运行一键验证脚本：

```bash
npm run test:wechat-api

# 脚本将测试：
# 1. 配置检查 ✓
# 2. 网络连接 ✓
# 3. Access Token 获取 ✓
# 4. 保存草稿 ✓
# 5. 发布文章 ✓
```

#### Step 3: 完全切换

如果验证全部通过，你已准备好使用真实 API：

```env
WECHAT_ADAPTER=real  # 改这一行即可
```

## 🎯 发布工作流

### 完整的发布流程

```
创建记录 (draft)
    ↓
在 Doocs 编辑
    ↓
提交审核 (pending_review)
    ↓
编辑审核 → 批准 (approved)
    ↓
发布到微信 (published)
    ↓
查看发布历史和统计
```

### 代码示例

```typescript
import * as PublishService from '@services/publish';
import * as WechatService from '@services/wechat';

// 1. 初始化
await WechatService.initWechatClient({
  appId: process.env.WECHAT_APP_ID!,
  appSecret: process.env.WECHAT_APP_SECRET!,
});

// 2. 创建发布记录
const record = await PublishService.createPublishRecord(
  '我的文章标题',
  '<h1>HTML 内容</h1>',
  'author_name',
  '/path/to/file.md'
);

// 3. 提交审核
await PublishService.submitForReview(record.id, record.content);

// 4. 审核通过
await PublishService.approvePublish(
  record.id,
  'reviewer_name',
  '很好的文章！'
);

// 5. 发布
await PublishService.executePublish(record.id);

// 6. 查询
const published = await PublishService.getPublishRecord(record.id);
console.log(published); // 已发布状态 + 微信 msgId
```

## 🔧 适配器说明

### Mock 适配器

**何时使用**：
- 开发阶段
- 测试阶段
- 演示和展示
- 无需真实微信账号

**特点**：
- ✅ 完全离线工作
- ✅ 秒级响应
- ✅ 适合单元测试
- ✅ 生成模拟的 token 和 msgId

### Real 适配器

**何时使用**：
- 生产环境
- 需要真实发布
- 需要获取真实统计数据

**特点**：
- ✅ 实际调用微信 API
- ✅ 完整的错误处理
- ✅ Token 自动缓存和刷新
- ✅ 完整的审计日志

## 📌 权限要求

### 必需的权限

| 功能 | 所需权限 | 说明 |
|------|---------|------|
| 获取 Token | - | 所有账号都有 |
| 保存草稿 | 草稿管理 | 大多数账号都有 |
| 发布（免审） | 发布权限 | 需要特殊申请 |
| 发布（审核版） | - | 所有账号都有 |
| 获取历史 | - | 所有账号都有 |

### 权限申请

如果遇到权限错误：

```
错误: 权限不足（permission denied）
解决: 
  1. 检查账号是否已激活
  2. 在微信公众号后台申请对应权限
  3. 如无免审权限，改用审核版发布流程
```

## 🧪 测试

### 单元测试

```bash
# 运行发布流程测试
npm run test:publish-flow

# 输出：
# PASS src/services/publish/index.test.ts
# ✓ Create publish record
# ✓ Submit for review
# ✓ Approve publish
# ✓ Execute publish
```

### 集成测试

```bash
# 验证真实 WeChat API
npm run test:wechat-api

# 或测试 Mock API
npm run test:wechat-mock
```

## 📊 发布统计

发布成功后，可以查询：

```typescript
const stats = await PublishService.getPublishStats();
console.log(stats);
// 输出：
// {
//   draft: 2,           // 草稿数
//   pending_review: 1,  // 待审核数
//   approved: 0,        // 已批准数
//   published: 5,       // 已发布数
//   failed: 0,          // 失败数
//   scheduled: 1        // 定时发布数
// }
```

## 🚨 常见问题

### Q1: "Cannot find module '@services/wechat'"

**原因**：TypeScript 编译未完成

**解决**：
```bash
npm run build
npm run test:wechat-api
```

### Q2: "WeChat API 错误: 权限不足"

**原因**：AppID/AppSecret 配置错误或权限不足

**解决**：
```bash
# 1. 检查 .env 文件
cat .env | grep WECHAT

# 2. 在微信公众号后台验证
#   - 确认 AppID 和 AppSecret 正确
#   - 检查是否已获得权限

# 3. 重试验证
npm run test:wechat-api
```

### Q3: "Cannot set headers after they are sent"

**原因**：Doocs 代理脚本注入错误（已修复）

**解决**：
```bash
# 该问题已在最新版本修复
# 如仍遇到，请重启 Doocs 服务
node tools/doocs/server.js
```

## 🔗 相关文件

- 配置：`.env.example`
- WeChat 服务：`src/services/wechat/index.ts`
- 适配器：`src/services/wechat/adapter.ts`
- 发布管理：`src/services/publish/index.ts`
- 验证脚本：`scripts/test-wechat-api.cjs`
- 演示脚本：`scripts/demo-publish-workflow.cjs`

## 📚 进阶配置

### 定时发布

```typescript
// 在指定时间发布
const futureTime = new Date(Date.now() + 3600 * 1000); // 1小时后
await PublishService.executePublish(recordId, futureTime);
```

### 自定义审核流程

```typescript
// 多人审核
await PublishService.submitForReview(recordId, content);
await PublishService.rejectPublish(recordId, 'reviewer1', '需要改进排版');
await PublishService.submitForReview(recordId, revisedContent);
await PublishService.approvePublish(recordId, 'reviewer2', '已改进');
await PublishService.executePublish(recordId);
```

### 监听发布事件（可选）

```typescript
// 未来版本支持事件系统
// PublishService.on('published', (record) => {
//   console.log(`文章已发布: ${record.title}`);
// });
```

## 🎓 学习资源

- 微信官方文档：https://developers.weixin.qq.com/doc/offiaccount/Article/
- Doocs 编辑器：http://127.0.0.1:8800/
- 项目文档：`docs/04-user-guide/`

## ✅ 检查清单

- [ ] 配置 `.env` 文件
- [ ] 运行 `npm run demo:publish` 验证演示
- [ ] 运行 `npm run test:wechat-api` 验证真实 API（可选）
- [ ] 在代码中集成发布功能
- [ ] 在微信公众号后台测试

---

**下一步**：优先级 3 - 完成发布流程实现细节和数据库集成
