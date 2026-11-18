# Doocs 本地存储 - 产品化改进指南

## 概述

本文档描述了对 Doocs 本地存储实现的产品化改进，包括代码质量、错误处理、日志记录、配置管理和运维支持。

## 改进清单

### ✅ 1. 代码结构与标准化

#### 后端 API (local-storage-api.prod.js)

**改进点:**
- ✓ 常量定义分组（CONFIG 对象）
- ✓ 日志系统（多级别：info, warn, error, debug）
- ✓ 自定义错误类（StorageError, ValidationError, NotFoundError, ConflictError）
- ✓ 验证器模块（Validators 对象）
- ✓ 存储操作模块（Storage 对象）
- ✓ 响应格式规范化（ResponseUtils）
- ✓ 中间件标准化（Middleware）

**规范:**
```javascript
// 错误处理标准
throw new ValidationError('Message here');
throw new NotFoundError('Document not found');

// 响应格式
{
  success: true/false,
  code: 'SUCCESS' | 'VALIDATION_ERROR' | 'NOT_FOUND' | ...,
  data: { ... },
  timestamp: '2026-09-23T...',
  pagination: { page, pageSize, total, totalPages } // 可选
}

// 日志标准
Logger.info('操作完成');
Logger.error('操作失败:', error);
```

**HTTP 状态码标准:**
- 200: 成功查询
- 201: 创建成功
- 400: 验证失败
- 404: 资源不存在
- 409: 冲突
- 500: 服务器错误

#### 前端适配器 (local-storage-adapter.prod.js)

**改进点:**
- ✓ IIFE 隔离作用域（防止污染全局）
- ✓ 严格模式（'use strict'）
- ✓ 错误类定义
- ✓ HTTP 客户端（自动重试、超时处理）
- ✓ 存储管理器（内存缓存）
- ✓ IndexedDB 拦截器
- ✓ 公共 API 稳定
- ✓ 日志记录

**API 稳定性:**
```javascript
// 公共接口（永不变更）
window.__LocalStorage__.getAll()
window.__LocalStorage__.get(id)
window.__LocalStorage__.save(id, data)
window.__LocalStorage__.delete(id)
window.__LocalStorage__.export()
window.__LocalStorage__.import(documents)
window.__LocalStorage__.getStatus()
window.__LocalStorage__.setDebug(enabled)
window.__LocalStorage__.clearCache()
```

### ✅ 2. 错误处理与安全性

**后端错误处理:**
- ✓ 入参验证（ID、标题、内容长度限制）
- ✓ 文件操作异常捕获
- ✓ JSON 解析错误处理
- ✓ 文件不存在异常处理
- ✓ 统一错误响应格式
- ✓ 错误日志记录

**前端错误处理:**
- ✓ 网络超时重试（最多 3 次）
- ✓ 网络错误捕获
- ✓ 验证错误反馈
- ✓ 缓存异常处理
- ✓ Promise 错误链

**安全约束:**
```javascript
// 输入验证
- Document ID: 最多 255 字符，仅允许字母数字、下划线、连字符、点
- Title: 最多 1000 字符
- Content: 最多 10MB
- Batch size: 最多 100 条记录
- File size: 最多 50MB
```

### ✅ 3. 日志系统

**结构化日志:**
```
[时间] [级别] 消息 附加数据
[19:52:04] [INFO] 文档已保存: test-doc
[19:52:05] [ERROR] 保存失败: permission denied
[19:52:06] [WARN] 跳过不合法的文件: corrupted.json
[19:52:07] [DEBUG] IndexedDB.open(doocs-md) -> 使用本地存储
```

**日志级别:**
- `info` - 正常操作
- `warn` - 警告（非致命）
- `error` - 错误
- `debug` - 调试信息（仅在 DEBUG=true 时）

### ✅ 4. 配置管理

**统一配置 (config.js)**

```javascript
export const CONFIG = {
  NODE_ENV: 'production' | 'development',
  VERSION: '1.0.0',
  SERVER: { HOST, PORT, PROXY_PORT },
  STORAGE: { ROOT, MAX_DOCUMENT_SIZE, ... },
  PROXY: { TARGET, CHANGE_ORIGIN, TIMEOUT },
  FEATURES: { LOCAL_STORAGE, AUTO_SYNC, ... },
  LOGGING: { LEVEL, FORMAT, MAX_FILE_SIZE },
  SECURITY: { CORS_ORIGIN, RATE_LIMIT_WINDOW, ... },
};

// 使用
getConfig('SERVER.PORT', 8800)
process.env.NODE_ENV = 'production'
process.env.DEBUG = 'true'
```

### ✅ 5. 运维支持

**启动脚本改进 (start-prod.cjs)**
- ✓ 彩色日志输出
- ✓ 时间戳
- ✓ 进度指示
- ✓ 端口检测与自动清理
- ✓ 服务就绪检测
- ✓ 优雅关闭处理
- ✓ 错误恢复与重试
- ✓ 详细的启动信息展示

**监控端点:**
```bash
# 健康检查
curl http://127.0.0.1:55885/api/storage/health

# 存储统计
curl http://127.0.0.1:55885/api/storage/stats

# 文档列表（分页）
curl http://127.0.0.1:55885/api/storage/documents?page=1&pageSize=20
```

### ✅ 6. 响应格式规范化

**统一响应结构:**
```json
{
  "success": true,
  "code": "SUCCESS",
  "data": {...},
  "timestamp": "2026-09-23T19:52:04.000Z"
}
```

**分页响应:**
```json
{
  "success": true,
  "code": "SUCCESS",
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  },
  "timestamp": "..."
}
```

**错误响应:**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "error": "Document ID must be a non-empty string",
  "timestamp": "..."
}
```

### ✅ 7. 数据持久化

**文件格式:**
```json
{
  "id": "my-doc",
  "title": "文档标题",
  "content": "# Markdown 内容",
  "metadata": {
    "tags": [],
    "category": "",
    "publishedTo": []
  },
  "createDatetime": "2026-09-23T19:52:04.000Z",
  "updateDatetime": "2026-09-23T19:52:04.000Z"
}
```

**存储路径:**
```
local-storage/
  ├── documents/
  │   ├── doc-1.json
  │   ├── doc-2.json
  │   └── doc-3.json
  └── metadata.json (可选)
```

## 迁移指南

### 从旧版本升级

1. **备份现有数据:**
   ```bash
   npm run export-backup
   ```

2. **部署新版本:**
   ```bash
   cp local-storage-api.prod.js local-storage-api.js
   cp local-storage-adapter.prod.js local-storage-adapter.js
   ```

3. **重启服务:**
   ```bash
   node start-prod.cjs
   ```

4. **验证:**
   ```bash
   curl http://127.0.0.1:55885/api/storage/health
   ```

## 性能指标

**预期性能:**
- 单个文档保存: < 100ms
- 获取所有文档（100 个）: < 500ms
- 批量导入（100 个）: < 2s
- 导出所有文档: < 1s

**内存占用:**
- 每个文档约 1-5KB（缓存）
- 1000 个文档约 5-50MB

## 测试建议

### 单元测试

```javascript
// 验证器测试
test('validateId 应拒绝特殊字符', () => {
  expect(() => Validators.validateId('test@doc')).toThrow();
});

// 存储操作测试
test('saveDocument 应自动添加时间戳', async () => {
  const doc = await Storage.saveDocument('test', { title: 'Test' });
  expect(doc.createDatetime).toBeDefined();
  expect(doc.updateDatetime).toBeDefined();
});
```

### 集成测试

```javascript
// API 测试
test('POST /documents 应返回 201', async () => {
  const res = await fetch('/api/storage/documents', {
    method: 'POST',
    body: JSON.stringify({ id: 'test', title: 'Test' }),
  });
  expect(res.status).toBe(201);
});

// 适配器测试
test('LocalStorage.save 应同步文件系统', async () => {
  await window.__LocalStorage__.save('test', { title: 'Test' });
  // 验证文件存在
  expect(fs.existsSync('local-storage/documents/test.json')).toBe(true);
});
```

### 压力测试

```bash
# 使用 Apache Bench
ab -n 1000 -c 10 http://127.0.0.1:55885/api/storage/documents

# 使用 wrk
wrk -t4 -c100 -d30s http://127.0.0.1:55885/api/storage/documents
```

## 故障排查

### 常见问题

**Q: 端口被占用**
```bash
# Windows
netstat -ano | findstr :55885
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:55885 | xargs kill -9
```

**Q: 适配器未加载**
```javascript
// 检查窗口对象
console.log(window.__LocalStorage__ !== undefined);

// 手动加载
const script = document.createElement('script');
script.src = '/local-storage-adapter.js';
document.head.appendChild(script);
```

**Q: 文件损坏**
```bash
# 验证 JSON
node -e "JSON.parse(require('fs').readFileSync('documents/doc.json'))"

# 导出并重新导入
curl http://127.0.0.1:55885/api/storage/export > backup.json
```

## 最佳实践

1. **定期备份**
   ```bash
   npm run backup  # 每日备份
   ```

2. **监控存储**
   ```bash
   # 定期检查健康状态
   watch -n 60 'curl -s http://127.0.0.1:55885/api/storage/health | jq'
   ```

3. **日志轮转**
   - 配置日志文件大小限制（MAX_FILE_SIZE）
   - 使用日志收集工具（ELK, Splunk 等）

4. **版本控制**
   - 使用 Git 追踪所有文档更改
   - 定期提交备份到版本库

## 下一步改进

- [ ] 数据库支持（SQLite, MongoDB）
- [ ] 版本控制系统
- [ ] 差异同步
- [ ] WebSocket 实时更新
- [ ] 离线编辑支持
- [ ] 端到端加密
- [ ] 多用户协作
- [ ] 自动备份系统

---

**最后更新:** 2026-09-23  
**版本:** 1.0.0 (Production)
