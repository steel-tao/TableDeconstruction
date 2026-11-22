# Doocs 本地部署

本目录用于隔离安装和运行官方 `@doocs/md-cli`，不把 Doocs 运行时依赖混入主应用。

## 当前验证结果

- 包版本：`@doocs/md-cli@2.1.3`
- Node：`v24.14.1`
- 本地页面：HTTP 200
- 页面标题：`微信 Markdown 编辑器 | Doocs`
- 私有化服务：可启动
- 端口：默认尝试 `8800`；端口被占用时自动选择其他可用端口
- 主题验证：Blue 与 Orange 主题切换后，预览区 H2 样式发生变化

## 安装

在仓库根目录执行：

```powershell
npm install --prefix tools/doocs @doocs/md-cli
```

## 启动

8800 由 `start-p1.ps1` 启动，等价于：

```powershell
node tools/doocs/server.js
```

`server.js` 会拉起 md-cli 子进程（端口由 `server.js` 决定），并代理到 `http://127.0.0.1:8800`。直接运行 md-cli CLI 不会注入 Obsidian 面板。

## 自定义 CSS 说明

Doocs 当前的排版主题不是通过 CLI 参数直接加载一个外部 CSS 文件，而是由主题配置生成微信公众号文章中的内联样式。网页版中的主题、颜色、字号、行高和自定义颜色设置在本地部署实例中可用。

项目自定义样式源文件位于：

```text
resources/css/doocs-custom-theme.css
```

该文件作为项目的 CSS 规范和后续主题适配基线。开发 Doocs 渲染适配器时，应将其中的设计变量映射到 Doocs 主题配置，或在 HTML 输出阶段作为受控的后处理规则使用。

## 验证范围

本次验证覆盖：

1. 官方 CLI 包可安装。
2. 本地服务可启动并提供页面。
3. 页面可在本机浏览器打开。
4. Doocs 内置主题切换能够改变预览结果。

本次验证不宣称：

- Doocs 提供公开稳定的 Markdown 渲染 HTTP API。
- 任意外部 CSS 文件可以直接被 CLI 自动注入。
- 微信最终发布效果与本地预览完全一致。
