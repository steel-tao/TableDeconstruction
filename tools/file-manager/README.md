# Obsidian 文件管理器 + Doocs 集成

文件管理器允许您直接从 Obsidian Vault 浏览、编辑文件，并一键打开到 Doocs 编辑器。

## 功能

- 📁 浏览 Obsidian Vault 中的所有文件
- 📖 按系列分组显示文件
- 📝 直接编辑文件内容
- 🚀 一键打开到 Doocs 编辑器
- 💾 保存修改到原始文件
- 📋 复制内容到剪贴板

## 安装

```bash
cd tools/file-manager
npm install
```

## 运行

```bash
npm start
```

访问 http://127.0.0.1:3000

## 与 Doocs 的集成

1. 在文件管理器中打开文件
2. 点击 "🚀 打开到 Doocs" 按钮
3. 内容会复制到剪贴板
4. 在 Doocs 编辑器中粘贴 (Ctrl+V)
5. 验证排版
6. 点击 Copy 按钮
7. 粘贴到微信后台

## API 端点

- `GET /api/files` - 获取文件列表
- `GET /api/file/:filename` - 获取文件内容
- `POST /api/file/save` - 保存文件内容

## 配置

编辑 `server.js` 中的 `VAULT_PATH` 变量来改变 Obsidian Vault 路径。

当前配置: `G:\Obsidian\wechat\桌面解构`
