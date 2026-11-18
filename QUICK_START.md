# 🚀 快速启动卡片

## 系统已就绪！✅

### 固定端口 (不再随机)
- 📁 文件管理器: http://127.0.0.1:3000
- 📝 Doocs 编辑器: http://127.0.0.1:55885

### 一键启动

#### 分别启动（推荐开发阶段）
```bash
# 终端 1
npm run start:file-manager

# 终端 2
npm run start:doocs
```

#### 同时启动（推荐生产使用）
```bash
npm run start-all
```

或使用 PowerShell:
```bash
.\scripts\start-services.ps1
```

## 文件流程
```
1. 打开 http://127.0.0.1:3000 (文件管理器)
   ↓
2. 选择 Obsidian 文件 + 编辑
   ↓
3. 点击 "🚀 打开到 Doocs"
   ↓
4. Doocs 自动填充文件内容
   ↓
5. 点击 Copy 按钮
   ↓
6. 粘贴到微信后台
```

## 已创建的脚本
- `tools/doocs/start.cjs` - Doocs 启动脚本
- `tools/file-manager/start.cjs` - 文件管理器启动脚本
- `scripts/start-all-services.cjs` - 全部启动脚本
- `scripts/start-services.ps1` - PowerShell 启动脚本

## npm 命令
```bash
npm run start:file-manager    # 启动文件管理器
npm run start:doocs           # 启动 Doocs 编辑器
npm run start-all             # 启动所有服务
```

## 当前运行状态
✅ Doocs 运行在 55885
✅ 文件管理器运行在 3000
✅ 两个服务都已启动

---
**所有需求已完成** ✅
- ✅ 固定端口（不随机）
- ✅ 程序化工程脚本
- ✅ 生产级别系统

查看详细文档: `SYSTEM_STARTUP_GUIDE.md`
