# 快速集成指南 - 产品化代码

## 📦 使用产品化版本

### 方式 A：新项目（推荐）

使用产品化版本的文件：

```bash
# 1. 使用产品化 API
cp local-storage-api.prod.js local-storage-api.js

# 2. 使用产品化适配器
cp local-storage-adapter.prod.js local-storage-adapter.js

# 3. 启动
node start-prod.cjs
```

### 方式 B：现有项目迁移

保持两个版本并行，逐步切换：

```bash
# 步骤 1：保留原始版本作为备份
mv local-storage-api.js local-storage-api.old.js
mv local-storage-adapter.js local-storage-adapter.old.js

# 步骤 2：复制产品化版本
cp local-storage-api.prod.js local-storage-api.js
cp local-storage-adapter.prod.js local-storage-adapter.js

# 步骤 3：测试
node start-prod.cjs

# 步骤 4：验证
curl http://127.0.0.1:55885/api/storage/health

# 步骤 5：如出现问题，快速回滚
mv local-storage-api.old.js local-storage-api.js
mv local-storage-adapter.old.js local-storage-adapter.js
```

---

## 🔧 配置

### 环境变量

创建 `.env` 文件：

```bash
# 环境
NODE_ENV=production
DEBUG=false

# 服务器
SERVER_HOST=127.0.0.1
SERVER_PORT=8800
PROXY_PORT=55885

# 存储
STORAGE_ROOT=./local-storage

# 日志
LOG_LEVEL=info

# 代理
PROXY_TARGET=https://md.doocs.org/
```

### 加载配置

```bash
# Linux/Mac
source .env
node start-prod.cjs

# Windows PowerShell
Get-Content .env | ForEach-Object {
  $name, $value = $_.Split("=")
  Set-Item env:$name $value
}
node start-prod.cjs

# 或直接使用
NODE_ENV=production DEBUG=false node start-prod.cjs
```

---

## 🚀 启动服务

### 第一次启动

```bash
cd tools/doocs
node start-prod.cjs
```

**预期输出：**
```
[19:52:04] ✓ 初始化存储目录
[19:52:04] ✓ 代理服务已启动 (端口: 55885)
[19:52:04] ✓ Doocs CLI 已启动 (端口: 8800)

🌐 访问地址:
   http://127.0.0.1:55885

💾 本地存储:
   API: /api/storage/documents
   状态: /api/storage/health
```

### 后台运行（生产环境）

```bash
# 使用 PM2
npm install -g pm2
pm2 start start-prod.cjs --name doocs
pm2 save
pm2 startup

# 使用 nohup（Linux/Mac）
nohup node start-prod.cjs > logs/doocs.log 2>&1 &

# 使用 screen（Linux/Mac）
screen -S doocs
node start-prod.cjs
# Ctrl+A, D 分离
```

---

## ✅ 验证和测试

### 健康检查

```bash
# 检查服务状态
curl http://127.0.0.1:55885/api/storage/health

# 预期响应
{
  "success": true,
  "status": "healthy",
  "version": "1.0.0"
}
```

### 创建文档

```bash
# 创建
curl -X POST http://127.0.0.1:55885/api/storage/documents \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "test-doc",
    "title": "Test Document",
    "content": "# Hello World"
  }'

# 响应
{
  "success": true,
  "code": "SUCCESS",
  "data": {
    "id": "test-doc",
    "title": "Test Document",
    "content": "# Hello World",
    "createDatetime": "2026-09-23T19:52:04.000Z",
    "updateDatetime": "2026-09-23T19:52:04.000Z"
  },
  "timestamp": "2026-09-23T19:52:04.000Z"
}
```

### 获取文档

```bash
curl http://127.0.0.1:55885/api/storage/documents/test-doc

# 或获取所有（分页）
curl 'http://127.0.0.1:55885/api/storage/documents?page=1&pageSize=20'
```

### 浏览器中测试

```javascript
// 在浏览器控制台运行
window.__LocalStorage__.setDebug(true)

// 获取所有文档
await window.__LocalStorage__.getAll()

// 保存文档
await window.__LocalStorage__.save('my-doc', {
  title: 'My Document',
  content: '# Content'
})

// 验证文件系统
// 查看 local-storage/documents/my-doc.json 是否存在
```

---

## 📊 监控

### 查看日志

```bash
# 实时日志（Windows PowerShell）
Get-Content -Wait logs/doocs.log

# Linux/Mac
tail -f logs/doocs.log

# 或在启动脚本中启用 DEBUG
DEBUG=true node start-prod.cjs
```

### 存储统计

```bash
# 获取存储信息
curl http://127.0.0.1:55885/api/storage/stats

# 响应
{
  "documentCount": 5,
  "totalSize": 245120,
  "totalSizeFormatted": "239.38 KB",
  "storagePath": "F:\\TableDeconstruction\\tools\\doocs\\local-storage\\documents",
  "timestamp": "2026-09-23T19:52:04.000Z"
}
```

### 查看文件

```bash
# 列出所有文档
ls -la local-storage/documents/

# 查看单个文档
cat local-storage/documents/my-doc.json

# 总大小
du -sh local-storage/documents/
```

---

## 🔄 导入/导出

### 导出所有数据

```bash
# API 导出
curl -X POST http://127.0.0.1:55885/api/storage/export > backup.json

# 或手动备份
cp -r local-storage/documents backup-$(date +%Y%m%d-%H%M%S)/
```

### 导入数据

```bash
# 从备份恢复
curl -X POST http://127.0.0.1:55885/api/storage/import \
  -H 'Content-Type: application/json' \
  -d @backup.json

# 或从文件恢复
BACKUP_JSON=$(cat backup.json)
curl -X POST http://127.0.0.1:55885/api/storage/import \
  -H 'Content-Type: application/json' \
  -d "$BACKUP_JSON"
```

### 迁移策略

```bash
# 步骤 1：从旧系统导出
# 使用浏览器 IndexedDB 导出工具或自定义脚本

# 步骤 2：转换格式（如果需要）
# 编写转换脚本

# 步骤 3：导入到新系统
curl -X POST http://127.0.0.1:55885/api/storage/import \
  -H 'Content-Type: application/json' \
  -d @converted.json

# 步骤 4：验证
curl http://127.0.0.1:55885/api/storage/stats
```

---

## 🐛 故障排查

### 常见问题

#### 问题 1：端口被占用

```bash
# Windows
netstat -ano | findstr :55885
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:55885 | xargs kill -9
```

#### 问题 2：适配器未加载

```javascript
// 在浏览器控制台检查
window.__LocalStorage__ !== undefined  // 应为 true

// 如果为 false，手动加载
const script = document.createElement('script');
script.src = '/local-storage-adapter.js';
document.head.appendChild(script);

// 等待加载
setTimeout(() => {
  console.log(window.__LocalStorage__ !== undefined);
}, 1000);
```

#### 问题 3：文件损坏

```bash
# 验证 JSON
node -e "try { JSON.parse(require('fs').readFileSync('local-storage/documents/doc.json')); console.log('✓ 有效'); } catch(e) { console.log('✗ 无效:', e.message); }"

# 恢复
# 从备份恢复或手动重建
```

#### 问题 4：性能下降

```javascript
// 检查缓存大小
window.__LocalStorage__.getAll().then(docs => {
  console.log('文档数:', docs.length);
  console.log('总大小:', JSON.stringify(docs).length / 1024, 'KB');
});

// 解决方案：
// 1. 分页查询
curl 'http://127.0.0.1:55885/api/storage/documents?pageSize=10'

// 2. 只加载必要的字段
// 3. 清理旧文档
curl -X DELETE http://127.0.0.1:55885/api/storage/documents/old-doc
```

---

## 📚 进阶用法

### 自定义中间件

```javascript
// 在 local-storage-api.js 中添加
router.use((req, res, next) => {
  // 自定义处理
  next();
});
```

### 添加认证

```javascript
// 添加 API 密钥验证
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token || !validateToken(token)) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Invalid token'
    });
  }
  next();
};

router.use(authMiddleware);
```

### 添加频率限制

```javascript
// 使用 express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 分钟
  max: 100  // 限制 100 请求
});

router.use(limiter);
```

### 自定义验证规则

```javascript
// 在 Validators 中扩展
Validators.validateCustom = (data) => {
  if (data.category && !validCategories.includes(data.category)) {
    throw new ValidationError('Invalid category');
  }
};
```

---

## 🚢 部署清单

- [ ] 备份现有数据
- [ ] 复制产品化文件
- [ ] 配置环境变量
- [ ] 本地测试
- [ ] 测试环境验证
- [ ] 性能测试
- [ ] 安全审计
- [ ] 文档更新
- [ ] 团队培训
- [ ] 灰度发布
- [ ] 生产部署
- [ ] 监控告警

---

## 📞 支持

如有问题，参考以下文档：

1. [LOCAL_STORAGE_PRODUCTION.md](./LOCAL_STORAGE_PRODUCTION.md) - 完整指南
2. [PRODUCT_STANDARDS_CHECKLIST.md](./PRODUCT_STANDARDS_CHECKLIST.md) - 标准检查
3. [PRODUCTION_COMPARISON.md](./PRODUCTION_COMPARISON.md) - 对比分析

---

**更新时间:** 2026-09-23  
**版本:** 1.0.0
