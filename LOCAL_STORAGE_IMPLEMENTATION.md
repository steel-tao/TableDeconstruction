# Doocs 本地存储集成方案

## 实现状态

### ✅ 已完成
1. **后端本地存储 API**
   - `/api/storage/documents` - 管理文档 (CRUD)
   - `/api/storage/status` - 存储状态查询
   - `/api/storage/export` - 导出所有文档
   - `/api/storage/import` - 导入文档
   - 文件保存路径: `tools/doocs/local-storage/documents/`

2. **前端存储适配器脚本**
   - `/local-storage-adapter.js` - IndexedDB 拦截与本地 API 转发
   - `window.__LocalStorage__` - 全局存储接口
   - 方法: `getAll()`, `save()`, `delete()`, `export()`, `import()`

3. **启动脚本**
   - `start-with-local-storage.cjs` - 集成启动脚本
   - 包含完整的错误处理和重启机制

### ⏳ 需要完成
1. **前端脚本注入问题**
   - 当前代理拦截导致 `res.send` 注入不生效
   - 需要采用其他方法（Service Worker 或直接 URL 参数加载）

---

## 架构设计

```
浏览器 (http://127.0.0.1:55885)
    ↓ (代理)
官方前端 (https://md.doocs.org)
    ↓ (本地脚本注入)
存储适配器 (/local-storage-adapter.js)
    ↓ (IndexedDB 拦截)
本地 API (Node.js 后端)
    ↓
本地文件系统 (F:\TableDeconstruction\tools\doocs\local-storage\)
```

---

## 快速开始

### 启动服务
```bash
cd tools/doocs
node start-with-local-storage.cjs
```

### 测试本地存储 API
```bash
# 获取所有文档
curl http://127.0.0.1:55885/api/storage/documents

# 获取存储状态
curl http://127.0.0.1:55885/api/storage/status

# 保存文档
curl -X POST http://127.0.0.1:55885/api/storage/documents \
  -H "Content-Type: application/json" \
  -d '{"id":"test-doc","title":"Test","content":"Hello World"}'

# 删除文档
curl -X DELETE http://127.0.0.1:55885/api/storage/documents/test-doc
```

### 在浏览器中测试
1. 打开 http://127.0.0.1:55885
2. 打开浏览器开发者工具 (F12)
3. 在控制台运行：
```javascript
// 加载适配器
const script = document.createElement('script');
script.src = '/local-storage-adapter.js';
document.head.appendChild(script);

// 等待 1 秒后测试
setTimeout(() => {
  window.__LocalStorage__.getAll().then(docs => {
    console.log('本地文档数量:', docs.length);
  });
}, 1000);
```

---

## 文件结构

```
tools/doocs/
├── start-with-local-storage.cjs    # 新启动脚本
├── local-storage-api.js             # 本地 API 服务
├── local-storage-adapter.js         # 前端适配器脚本
├── local-storage/
│   └── documents/                   # 文档存储目录
├── node_modules/
│   └── @doocs/md-cli/
│       └── server.js                # 已修改，集成本地 API
└── ...
```

---

## API 参考

### GET /api/storage/documents
获取所有文档列表

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-1",
      "title": "Document Title",
      "content": "Markdown content...",
      "createDatetime": "2026-09-23T...",
      "updateDatetime": "2026-09-23T..."
    }
  ],
  "count": 1
}
```

### GET /api/storage/documents/:id
获取单个文档

### POST /api/storage/documents
创建或更新文档

**请求:**
```json
{
  "id": "my-document",
  "title": "My Doc",
  "content": "# Content",
  "metadata": {}
}
```

### DELETE /api/storage/documents/:id
删除文档

### POST /api/storage/export
导出所有文档

### POST /api/storage/import
导入文档

**请求:**
```json
{
  "documents": [
    {
      "id": "doc-1",
      "title": "Title",
      "content": "..."
    }
  ]
}
```

### GET /api/storage/status
获取存储状态

**响应:**
```json
{
  "success": true,
  "status": "active",
  "documentCount": 5,
  "totalSize": "125 KB",
  "storagePath": "F:\\TableDeconstruction\\tools\\doocs\\local-storage"
}
```

---

## 前端接口

### window.__LocalStorage__

#### getAll()
获取所有文档
```javascript
const docs = await window.__LocalStorage__.getAll();
```

#### save(id, data)
保存文档
```javascript
const result = await window.__LocalStorage__.save('my-doc', {
  title: 'My Document',
  content: '# Hello'
});
```

#### delete(id)
删除文档
```javascript
const success = await window.__LocalStorage__.delete('my-doc');
```

#### export()
导出所有文档
```javascript
const docs = await window.__LocalStorage__.export();
```

#### import(documents)
导入文档
```javascript
await window.__LocalStorage__.import([
  {
    id: 'imported-doc',
    title: 'Imported',
    content: '...'
  }
]);
```

---

## 现有问题与解决方案

### 问题 1: 前端脚本注入不生效

**原因:** 代理中间件 (createProxyMiddleware) 完全处理 HTML 响应，`res.send` 注入无法拦截

**解决方案:**
方案 A: 使用 Service Worker
- 创建 `/sw.js`，拦截所有 HTML 响应
- 在 Service Worker 中注入脚本

方案 B: 手动加载（用户侧）
- 用户在浏览器控制台加载: `<script src="/local-storage-adapter.js"></script>`
- 或创建书签脚本

方案 C: 修改代理中间件选项
- 在代理中使用 `onProxyReq` 或 `onProxyRes` 钩子
- 直接修改代理返回的响应

**当前建议:** 采用方案 C（修改代理响应钩子）

---

## 下一步

1. **修复脚本注入**
   - 通过代理中间件的响应钩子注入

2. **测试数据同步**
   - 前端编辑 → IndexedDB 拦截 → 本地文件
   - 文件 → API 导入 → 浏览器显示

3. **与 Obsidian Vault 集成**
   - 添加 `/api/sync/obsidian/*` 端点
   - 同步 `obsidian-vault/articles/` 与本地存储

4. **发布状态追踪**
   - 在文档元数据中添加发布状态字段
   - 集成 WeChat API（可选）

---

## 注意事项

- 所有文档存储为 JSON 文件（`{id}.json`）
- 文件存储路径: `F:\TableDeconstruction\tools\doocs\local-storage\documents\`
- API 限制: 单个文件最大 50MB
- 前端必须通过脚本注入或手动加载适配器才能使用本地存储
