# 启动系统指南

## 快速启动

### 方式 1: 启动所有服务（推荐）

```bash
# 在项目根目录执行
npm run start-all
```

这会同时启动：
- 📁 **文件管理器** (http://127.0.0.1:3000)
- 📝 **Doocs 编辑器** (http://127.0.0.1:55885)

### 方式 2: 单独启动各服务

#### 启动文件管理器
```bash
npm run start:file-manager
# 或
cd tools/file-manager
npm start
# 或
node start.js
```
访问: http://127.0.0.1:3000

#### 启动 Doocs 编辑器
```bash
npm run start:doocs
# 或
cd tools/doocs
node start.js
```
访问: http://127.0.0.1:55885

## 端口配置

| 服务 | 端口 | 配置文件 |
|------|------|---------|
| 文件管理器 | 3000 | `tools/file-manager/start.js` |
| Doocs Proxy | 55885 | `tools/doocs/start.js` |
| Doocs CLI | 52269 | 内部 (自动启动) |

**端口是固定的** - 不会随机变化

## 功能流程

1. **打开文件管理器** → http://127.0.0.1:3000
   - 显示所有 Obsidian 文件（按系列分组）
   - 点击文件查看内容

2. **打开到 Doocs**
   - 点击 "🚀 打开到 Doocs" 按钮
   - 内容自动保存到 localStorage
   - Doocs 窗口打开

3. **自动填充**
   - Doocs 页面加载时检测 localStorage
   - 自动填充编辑器
   - 无需手动粘贴

4. **复制到微信**
   - 点击 Doocs 的 "Copy" 按钮
   - 粘贴到微信后台

## 常见问题

### Q: 端口被占用怎么办？
A: 启动脚本会自动检测和清理占用的端口。如果仍然无法启动，可以手动杀死进程：

```powershell
# 查看占用端口的进程
netstat -ano | findstr :3000
netstat -ano | findstr :55885

# 杀死进程 (替换 PID)
taskkill /PID 12345 /F
```

### Q: Doocs 没有自动填充怎么办？
A: 检查浏览器控制台 (F12) 是否有错误消息。可能的原因：
- JavaScript 被禁用
- 浏览器安全策略阻止了 localStorage
- 编辑器容器加载延迟

此时手动粘贴即可（Ctrl+V）。

### Q: 修改了文件但没有保存怎么办？
A: 点击文件管理器的 "💾 保存文件" 按钮将内容写入磁盘。

## 脚本文件说明

### `scripts/start-all-services.js`
- 协调所有服务的启动
- 自动清理占用的端口
- 并行启动所有服务
- 提供统一的输出和错误处理

### `tools/file-manager/start.js`
- 启动文件管理器 Express 服务器
- 监听 http://127.0.0.1:3000
- 自动清理占用端口

### `tools/doocs/start.js`
- 启动 Doocs CLI 和代理服务
- 监听内部 52269 端口（Doocs）和外部 55885 端口（代理）
- 注入自动填充脚本

## 开发者信息

### 添加更多服务
1. 修改 `scripts/start-all-services.js` 中的 `CONFIG` 对象
2. 添加新的服务配置
3. 确保服务有相应的启动脚本

### 修改端口
1. 编辑 `tools/file-manager/start.js` 中的 `PORT` 变量
2. 编辑 `tools/doocs/start.js` 中的 `PROXY_PORT` 变量
3. 更新相应的配置文件和文档

### 日志级别
- 所有脚本都支持彩色输出
- 错误、警告和信息分别用不同颜色显示
- 查看 `scripts/` 文件了解具体的日志格式

## 技术栈

- **文件管理器**: Express.js + Vanilla JS
- **Doocs**: @doocs/md-cli + HTTP 代理
- **启动脚本**: Node.js child_process + HTTP
- **端口管理**: netstat + taskkill (Windows)

## 许可证

MIT
