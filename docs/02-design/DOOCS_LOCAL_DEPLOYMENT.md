# Doocs 本地部署与主题验证记录

**状态**: 已验证  
**验证日期**: 2026-09-23

## 结论

Doocs 可以通过官方 `@doocs/md-cli` 在本机运行。当前项目采用隔离安装方式，运行目录为 `tools/doocs`，不改变主应用的依赖树。

## 已验证项

| 项目 | 结果 |
|------|------|
| `@doocs/md-cli` 安装 | 通过，版本 2.1.3 |
| 本地服务启动 | 通过 |
| 页面 HTTP 访问 | 通过，HTTP 200 |
| 页面标题 | `微信 Markdown 编辑器 | Doocs` |
| 内置主题切换 | 通过 |
| 自定义视觉基线 | 已建立 |

浏览器验证中，切换 Blue 与 Orange 后，预览区 H2 背景颜色分别为：

- Blue: `rgb(15, 76, 129)`
- Orange: `rgb(250, 81, 81)`

这证明本地实例的主题配置会影响排版预览。

## 启动方式

8800 由 `start-p1.ps1` 启动，等价于直接运行：

```powershell
node tools/doocs/server.js
```

`tools/doocs/server.js` 代理 md-cli 子进程并在顶层页注入 Obsidian 面板；不要直接运行 md-cli 的 CLI，否则没有面板。

## CSS 策略

Doocs 的文章渲染器会依据主题配置生成内联样式，因此项目不把“外部 CSS 文件直接注入 Doocs CLI”作为已支持能力。项目保留以下两层设计：

1. `resources/css/doocs-custom-theme.css`：项目视觉规范、颜色变量和输出后处理基线。
2. Doocs 主题设置：本地编辑时用于选择主题、字号、颜色和其他排版选项。

后续渲染适配器将把项目 CSS 变量映射到 Doocs 主题配置；必要时再对最终 HTML 做受控后处理。

## 8800 顶层导入面板

面板的行为、数据源、代码位置与未做项见 [CURRENT_STATUS.md](../../CURRENT_STATUS.md) §3 B、§4.4–§4.5、§6。本文件不重复记录。

## 风险边界

本次验证只确认本地部署和主题能力，不确认：

- Doocs 的稳定公开渲染 API；
- 微信编辑器对所有复杂 HTML 的最终兼容性；
- 外部图片、公式和 Mermaid 在微信端的最终呈现。

这些属于后续轻量全链路验证范围，微信发布仍保留 copy/paste 兜底。未做项见 [CURRENT_STATUS.md](../../CURRENT_STATUS.md) §6。

