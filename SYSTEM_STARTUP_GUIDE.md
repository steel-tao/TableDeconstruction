# 🚀 Obsidian-Doocs 集成系统 - 启动指南

## 系统架构

```
┌─────────────────────────────────────────┐
│   Obsidian Vault                        │
│   (G:\Obsidian\wechat\桌面解构)        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   📁 文件管理器 (固定端口: 3000)        │
│   ✓ 浏览 Obsidian 文件                  │
│   ✓ 编辑文件内容                        │
│   ✓ 保存修改                            │
│   ✓ localStorage 桥接                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   📝 Doocs 编辑器 (固定端口: 55885)    │
│   ✓ HTTP 代理服务                       │
│   ✓ 自动填充脚本注入                    │
│   ✓ localStorage 监听                   │
│   ✓ Doocs CLI (内部: 52269)             │
└──────────────┬──────────────────────────┘
               │
               ▼
            📋 微信后台
```

## 快速启动

### 方式 1: 分别启动（推荐学习和调试）

**终端 1 - 启动 Doocs 编辑器：**
```bash
cd tools/doocs
npm start
# 或
node start.cjs
```
✅ 访问: http://127.0.0.1:55885

**终端 2 - 启动文件管理器：**
```bash
cd tools/file-manager
npm start
# 或
node start.cjs
```
✅ 访问: http://127.0.0.1:3000

### 方式 2: 使用 PowerShell 同时启动所有服务（推荐生产使用）

```bash
# Windows PowerShell
.\scripts\start-services.ps1

# 或使用 npm
npm run start-all
```

## 工作流程

### 步骤 1: 打开文件管理器
浏览器访问 http://127.0.0.1:3000

```
┌────────────────────────────────────┐
│  📁 Obsidian 文件管理器            │
├────────┬────────────────────────────┤
│ 深度解构│ 选择一个文件开始编辑      │
│ AI冷战 │                            │
│        │ 选择后显示:                │
│ ├─ 00  │ - 文件标题                 │
│ ├─ 01  │ - 字数统计                 │
│ ├─ 02  │ - 阅读时间                 │
│ └─ 04  │ - 编辑器                   │
│        │ - 按钮:                    │
│ 石板   │  🚀 打开到 Doocs          │
│ 亚纪   │  💾 保存文件              │
│ ├─ 00  │  📋 复制内容              │
│ ├─ 01  │                            │
│ ├─ 02  │                            │
│ └─ 03  │                            │
└────────┴────────────────────────────┘
```

### 步骤 2: 点击文件打开编辑器
- 左侧文件列表显示所有 Obsidian 文件
- 按系列分组（深度解构AI冷战、石板亚纪）
- 每个文件显示字数

### 步骤 3: 点击 "🚀 打开到 Doocs" 按钮
- 内容自动保存到 localStorage
- 打开 Doocs 新窗口 (http://127.0.0.1:55885)
- **自动填充** - Doocs 页面加载时自动检测 localStorage
- 编辑器内容自动出现，无需手动粘贴

### 步骤 4: 验证排版并复制
- 检查 Markdown 排版
- 点击 Doocs 的 "Copy" 按钮
- 粘贴到微信公众号后台

## 端口配置

| 组件 | 端口 | 类型 | 说明 |
|------|------|------|------|
| 文件管理器 | 3000 | Express | 前端 UI + API |
| Doocs 代理 | 55885 | HTTP Proxy | 对外入口 |
| Doocs CLI | 52269 | 内部 | 实际编辑器 (自动启动) |

**关键特性:**
- ✅ 所有端口都是 **固定的**，不会随机变化
- ✅ 每个服务都有独立的启动脚本
- ✅ 自动清理占用的端口
- ✅ 错误恢复和自动重启机制

## 启动脚本文件

### `tools/doocs/start.cjs`
- 启动 Doocs CLI
- 启动 HTTP 代理服务器
- 监听端口 55885
- 注入自动填充脚本
- 自动重启机制

### `tools/file-manager/start.cjs`
- 启动 Express 服务器
- 扫描 Obsidian Vault
- 提供 REST API
- 监听端口 3000

### `scripts/start-services.ps1`
- PowerShell 启动脚本
- 同时启动所有服务
- 自动清理端口
- 统一日志输出

## npm 命令

```bash
# 启动文件管理器
npm run start:file-manager

# 启动 Doocs 编辑器
npm run start:doocs

# 启动所有服务
npm run start-all
```

## 常见问题

### Q: 如何验证服务是否在运行？
A: 在浏览器中访问：
- http://127.0.0.1:3000 - 文件管理器
- http://127.0.0.1:55885 - Doocs 编辑器

### Q: 端口被占用怎么办？
A: 启动脚本会自动检测和清理占用的端口。如果仍有问题：
```bash
# Windows: 查看占用端口的进程
netstat -ano | findstr :3000
netstat -ano | findstr :55885

# 杀死进程 (替换 PID)
taskkill /PID <PID> /F
```

### Q: 自动填充不工作怎么办？
A: 检查浏览器控制台 (F12):
- 确保 localStorage 未被禁用
- 检查是否有 JavaScript 错误
- 如有问题，可手动粘贴 (Ctrl+V)

### Q: 如何修改 Obsidian Vault 路径？
A: 编辑 `tools/file-manager/server.js`:
```javascript
const VAULT_PATH = 'G:\\Obsidian\\wechat\\桌面解构'; // 修改这里
```

### Q: 如何修改端口？
A: 编辑对应的启动脚本：

**文件管理器** - `tools/file-manager/start.cjs`:
```javascript
const PORT = 3000; // 改为你需要的端口
```

**Doocs** - `tools/doocs/start.cjs`:
```javascript
const PROXY_PORT = 55885; // 改为你需要的端口
```

## 架构优势

### 1. 固定端口
- 所有端口都是配置固定的，不会随机变化
- 易于书签和快捷方式
- 易于集成其他工具

### 2. 程序化启动
- 专业的 Node.js 启动脚本
- 完整的错误处理
- 自动端口清理机制
- 进程健康监控

### 3. 自动填充
- 无需手动粘贴
- localStorage 桥接
- 脚本注入机制
- 失败重试逻辑

### 4. 完全隔离
- 文件管理器独立运行
- Doocs 作为独立服务
- 模块化架构
- 易于扩展

## 下一步

### 功能增强（可选）
1. 添加文件上传功能
2. 添加 Markdown 预览
3. 添加文件搜索
4. 添加快捷键支持
5. 添加主题切换

### 部署（可选）
1. Docker 容器化
2. 生产服务器部署
3. PM2 进程管理
4. Nginx 反向代理

### 自动化（可选）
1. 创建快捷启动脚本
2. 添加系统开机自启
3. 监控和告警
4. 日志收集

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端 | Vanilla JS + HTML/CSS | - |
| 文件管理器 | Express.js | ^4.18.2 |
| 编辑器 | @doocs/md-cli | ^2.1.3 |
| 启动脚本 | Node.js + HTTP | 18+ |
| 系统 | Windows PowerShell | 5.1+ |

## 许可证

MIT

---

**最后更新**: 2024年
**维护者**: AI Assistant
**状态**: ✅ 生产就绪
