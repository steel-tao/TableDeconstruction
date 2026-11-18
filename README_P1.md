# 🎯 TableDeconstruction P1 系统 - 完整指南

**最后更新**: 2026-11-18  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪

---

## 📋 目录

1. [快速开始](#快速开始)
2. [系统架构](#系统架构)
3. [完整启动流程](#完整启动流程)
4. [API 文档](#api-文档)
5. [常见问题](#常见问题)
6. [开发指南](#开发指南)

---

## 🚀 快速开始

### 一键启动

```powershell
# 完整启动（API + 文件管理器）
.\start-p1.ps1 -Mode full

# 仅启动 API
.\start-p1.ps1 -Mode api

# 仅启动文件管理器
.\start-p1.ps1 -Mode files
```

### 手动启动

```powershell
# 编译
npm run build

# 启动 API 服务器（端口 3001）
npm run start:server

# 在另一个终端启动文件管理器（端口 3000）
npm run start:file-manager
```

### 访问系统

- **控制面板**: 打开文件 `P1_CONTROL_PANEL.html`
- **API 文档**: http://localhost:3001/
- **文件管理器**: http://localhost:3000/

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   用户交互层                             │
├─────────────────────────────────────────────────────────┤
│  P1_CONTROL_PANEL.html  │  文件管理器 (3000)           │
│      (本地 HTML)        │   (Web UI)                   │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
        HTTP + JSON                HTTP + JSON
               │                          │
┌──────────────▼──────────────────────────▼───────────────┐
│          API 服务器 (端口 3001)                          │
│        Express.js + TypeScript                          │
├─────────────────────────────────────────────────────────┤
│  ✓ WeChat API 集成 (P1)                                 │
│  ✓ 发布记录管理 (P2)                                     │
│  ✓ Markdown/HTML 渲染 (P3)                              │
│  ✓ 内容验证与规范化 (P4)                                │
│  ✓ 文件监听与自动发布 (P5)                              │
└──────────────┬──────────────────────────────────────────┘
               │
        SQL 操作
               │
┌──────────────▼──────────────────────────────────────────┐
│          SQLite 数据库                                   │
│        (db.sqlite)                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 完整启动流程

### 步骤 1: 准备环境

```powershell
cd F:\TableDeconstruction

# 检查依赖是否已安装
npm list --depth=0

# 如果需要安装/更新
npm install
```

### 步骤 2: 配置 WeChat

创建或编辑 `.env` 文件：

```env
# WeChat 配置（真实 API）
WECHAT_ADAPTER=real
WECHAT_APP_ID=wxxxxxxxxxxx
WECHAT_APP_SECRET=你的AppSecret
WECHAT_TOKEN=接收消息验证token

# 服务器配置
PORT=3001
HOST=localhost
NODE_ENV=production
CORS_ORIGIN=http://127.0.0.1:3000

# 数据库配置
DB_PATH=./db.sqlite
```

### 步骤 3: 编译和启动

```powershell
# 使用启动脚本（推荐）
.\start-p1.ps1 -Mode full

# 或手动启动
npm run build
npm run start:server
npm run start:file-manager  # 新终端
```

### 步骤 4: 验证启动

在浏览器中访问：
- http://localhost:3001/ - 应该看到 API JSON 文档
- http://localhost:3000/ - 应该看到文件管理器
- 打开 `P1_CONTROL_PANEL.html` - 应该看到控制面板

### 步骤 5: 完整工作流测试

#### 使用控制面板：
1. 打开 `P1_CONTROL_PANEL.html`
2. 填写文章标题和内容
3. 点击"创建"
4. 获得记录 ID
5. 点击"提交审核"
6. 点击"批准"
7. 点击"发布"
8. 查看 WeChat 消息 ID

#### 或使用文件管理器：
1. 打开 http://localhost:3000/
2. 编辑 Obsidian 文件
3. 点击"保存到发布 API"
4. 自动创建发布记录

---

## 📡 API 文档

### 根路由

**GET** `/`

返回系统信息和所有可用 API 端点

**响应示例**:
```json
{
  "name": "WeChat 内容管理与发布系统 P1",
  "version": "0.1.0",
  "status": "running",
  "environment": "production",
  "features": ["✅ P1 - WeChat Token 管理", ...],
  "endpoints": { ... }
}
```

### WeChat 接口

#### 获取 Access Token

**POST** `/api/wechat/token`

```bash
curl -X POST http://localhost:3001/api/wechat/token
```

**响应**:
```json
{
  "success": true,
  "data": {
    "access_token": "110_EAC74yw0YuXuTPmUqnc2e4_c9PkMhIYZ7..."
  }
}
```

#### 保存为草稿

**POST** `/api/wechat/draft`

```bash
curl -X POST http://localhost:3001/api/wechat/draft \
  -H "Content-Type: application/json" \
  -d '{
    "title": "文章标题",
    "content": "<h1>HTML 内容</h1>",
    "author": "作者名"
  }'
```

#### 发布文章

**POST** `/api/wechat/publish`

```bash
curl -X POST http://localhost:3001/api/wechat/publish \
  -H "Content-Type: application/json" \
  -d '{
    "title": "文章标题",
    "content": "<h1>HTML 内容</h1>",
    "author": "作者名"
  }'
```

### 发布记录接口

#### 创建记录

**POST** `/api/publish/records`

```bash
curl -X POST http://localhost:3001/api/publish/records \
  -H "Content-Type: application/json" \
  -d '{
    "title": "文章标题",
    "content": "Markdown 内容",
    "creator": "用户名"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "文章标题",
    "content": "内容",
    "status": "draft",
    "createdAt": "2026-11-18T...",
    ...
  }
}
```

#### 获取记录

**GET** `/api/publish/records/:id`

#### 列表查询

**GET** `/api/publish/records`

#### 提交审核

**POST** `/api/publish/records/:id/submit-review`

#### 批准发布

**POST** `/api/publish/records/:id/approve`

```bash
curl -X POST http://localhost:3001/api/publish/records/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewer": "admin",
    "comment": "批准发布"
  }'
```

#### 拒绝发布

**POST** `/api/publish/records/:id/reject`

#### 发布到 WeChat

**POST** `/api/publish/records/:id/publish`

---

### Doocs 编辑器集成 API

**系统新增功能**：Doocs 编辑器自动集成，无需手动复制粘贴。所有发布流程会自动调用 Doocs 进行微信兼容性排版。

#### 检查 Doocs 服务状态

**GET** `/api/doocs/status`

```bash
curl -X GET http://localhost:3001/api/doocs/status
```

**响应**:
```json
{
  "available": true,
  "url": "http://127.0.0.1:8800",
  "message": "Doocs service is running"
}
```

#### 渲染 Markdown 为微信兼容 HTML

**POST** `/api/doocs/render`

```bash
curl -X POST http://localhost:3001/api/doocs/render \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 标题\n\n这是内容",
    "options": {
      "theme": "default",
      "fullPage": false
    }
  }'
```

**响应**:
```json
{
  "success": true,
  "html": "<h1 style=\"...\">标题</h1><p style=\"...\">这是内容</p>"
}
```

#### 批量渲染

**POST** `/api/doocs/batch-render`

```bash
curl -X POST http://localhost:3001/api/doocs/batch-render \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "id": "1", "markdown": "# 文章1" },
      { "id": "2", "markdown": "# 文章2" }
    ]
  }'
```

**自动集成流程**：
1. 用户创建发布记录（Markdown 或 HTML）
2. 提交审核和批准
3. 执行发布时，系统自动：
   - 检测 Doocs 服务状态
   - 调用 `/api/doocs/render` 进行排版
   - 保存渲染后的 HTML
   - 发送到 WeChat API
4. 完成发布，无需任何手动操作

---

## 🔧 常见问题

### Q: 如何停止服务？

```powershell
# 方法 1: Ctrl+C（如果用启动脚本）
# 方法 2: 杀死所有 Node 进程
Stop-Process -Name node -Force
```

### Q: 端口已被占用怎么办？

启动脚本会自动清理占用的端口。如果手动启动，可以：

```powershell
# 查看占用情况
netstat -ano | findstr :3001

# 杀死进程
Stop-Process -Id <PID> -Force
```

### Q: WeChat 发布失败，显示 "invalid media_id"

这是 WeChat API 的正常响应。原因可能是：
1. HTML 内容格式不符合要求
2. 缩略图字段缺失
3. 切换到 Mock 模式测试：在 `.env` 中设置 `WECHAT_ADAPTER=mock`

### Q: 数据库文件丢失或损坏

系统会自动创建新的数据库文件（db.sqlite），所有表结构会自动初始化。

### Q: 如何在开发环境运行？

```powershell
npm run start:api  # 使用 ts-node-dev（带热重载）
npm run dev:api    # 指定端口 3000 运行
```

---

## 🛠️ 开发指南

### 项目结构

```
TableDeconstruction/
├── src/
│   ├── server.ts              # Express 主服务器
│   ├── routes/
│   │   ├── publish.ts         # 发布流程路由
│   │   └── wechat.ts          # WeChat API 路由
│   ├── services/
│   │   ├── wechat/            # WeChat 集成
│   │   ├── publish/           # 发布流程管理
│   │   └── file-system/       # 文件监听
│   ├── core/
│   │   ├── renderer/          # Markdown 渲染
│   │   └── validator/         # 内容验证
│   └── db/
│       └── database.ts        # 数据库管理
├── dist/                      # 编译输出
├── tools/
│   ├── file-manager/          # 文件管理器 UI
│   └── doocs/                 # Doocs 集成
├── P1_CONTROL_PANEL.html      # 操作面板
├── start-p1.ps1              # 启动脚本
└── package.json
```

### 修改代码后编译

```powershell
npm run build      # 编译一次
npm run dev:api    # 开发模式（热重载）
```

### 运行测试

```powershell
npm test                              # 所有测试
npm test -- --watch                  # 监听模式
npm test src/services/publish         # 特定测试
npm run test:coverage                 # 覆盖率报告
```

### 代码规范

```powershell
npm run lint       # 检查代码规范
npm run lint:fix   # 自动修复规范问题
npm run format     # 格式化代码
```

---

## 📈 性能指标

| 指标 | 值 |
|------|-----|
| API 响应时间 | <100ms |
| 启动时间 | ~3 秒 |
| 内存占用 | 50-100MB |
| 数据库 | SQLite (better-sqlite3) |
| 并发支持 | 单进程 Node.js |

---

## 🔐 安全性

### 环境变量

所有敏感信息必须存储在 `.env` 文件中：
- WeChat AppSecret
- 数据库密钥（如有）
- 私有 API Token

**⚠️ 注意**: `.env` 文件不应该提交到 Git

### 生产部署

1. 设置 `NODE_ENV=production`
2. 配置防火墙允许 3000 和 3001
3. 使用 HTTPS 反向代理（如 nginx）
4. 定期备份数据库
5. 启用日志监控

---

## 📞 支持

如有问题，请检查：
1. `.env` 文件配置
2. 端口是否被占用
3. WeChat 凭证是否正确
4. 数据库文件是否存在

---

**系统版本**: 1.0.0 P1  
**最后测试**: 2026-11-18  
**部署状态**: ✅ 生产就绪
