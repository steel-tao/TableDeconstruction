# 🚀 P1 系统快速参考

## 一键启动

```powershell
cd F:\TableDeconstruction
.\start-p1.ps1 -Mode full
```

**输出应该显示**:
```
✓ API 服务器已启动 → http://localhost:3001
✓ 文件管理器已启动 → http://localhost:3000
✅ 系统启动完成！
```

## 验证系统

在新的 PowerShell 窗口运行：

```powershell
cd F:\TableDeconstruction
.\verify-p1.ps1
```

**应该看到**:
```
✓ API 服务器 (3001) - OK (200)
✓ 文件管理器 (3000) - OK (200)
✓ WeChat Token 获取 - OK
🎉 系统完全就绪！所有服务正常运行。
```

## 访问系统

| 组件 | 链接 | 功能 |
|------|------|------|
| **控制面板** | 打开 `P1_CONTROL_PANEL.html` | 创建和管理发布记录 |
| **API 文档** | http://localhost:3001 | 查看所有可用 API 端点 |
| **文件管理** | http://localhost:3000 | 管理 Obsidian 文件 |

## 完整工作流

### 步骤 1: 创建记录
打开 `P1_CONTROL_PANEL.html`
- 填写文章标题
- 填写文章内容
- 点击 **"创建"** 按钮

### 步骤 2: 提交审核
- 点击 **"提交审核"** 按钮
- 记录状态变为 "pending_review"

### 步骤 3: 批准发布
- 点击 **"批准"** 按钮
- 记录状态变为 "approved"

### 步骤 4: 发布到 WeChat
- 点击 **"发布"** 按钮
- 获得 WeChat 消息 ID
- 记录状态变为 "published"

## 停止系统

```powershell
# 在启动脚本窗口按 Ctrl+C
# 或在任意 PowerShell 窗口运行：
Stop-Process -Name node -Force
```

## 常见问题快速解决

| 问题 | 解决方案 |
|------|--------|
| 端口已被占用 | 运行启动脚本会自动清理 |
| API 无响应 | 检查 `npm run build` 是否成功 |
| WeChat Token 失败 | 检查 `.env` 中的 APP_ID 和 APP_SECRET |
| 文件管理器无响应 | 访问 http://localhost:3000 刷新页面 |

## 文件位置

- 📄 **启动脚本**: `start-p1.ps1`
- 📄 **验证脚本**: `verify-p1.ps1`
- 📋 **完整文档**: `README_P1.md`
- 🎛️ **控制面板**: `P1_CONTROL_PANEL.html`
- 🗄️ **数据库**: `db.sqlite`

## 技术栈

- **后端**: Express.js + TypeScript
- **前端**: HTML5 + Vanilla JavaScript
- **数据库**: SQLite
- **集成**: WeChat API
- **文件管理**: Node.js

---

**系统版本**: 1.0.0 P1  
**状态**: ✅ 生产就绪  
**最后更新**: 2026-11-18
