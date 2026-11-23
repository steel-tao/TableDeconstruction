# 当前状态

> 用途：项目现状的唯一记录。只写当前仍成立的内容，每条事实只出现一次。
> 窗口切换的交接信息见 [DOOCS_WECHAT_HANDOFF.md](docs/03-reports/DOOCS_WECHAT_HANDOFF.md)。

---

## 1. 目标与能力状态

目标：Obsidian 文章 → 8800（Doocs 编辑器）→ 微信公众号草稿箱。其中“在 3000 文件管理页内嵌 8800 完成发布”是目标，尚未实现。

| 能力 | 状态 |
|---|---|
| 3000 选文章 → 填充内嵌 8800 编辑器 | 通过（截图验证，3644 字） |
| 8800 顶层悬浮面板：复制正文 | 通过（用户验证） |
| 8800 顶层发布到草稿箱 | 通过（用户验证） |
| 3000 内嵌 8800 发布到草稿箱 | **未实现，阻塞**（见 §5） |
| 启动后显示官方示例文章 | 未实施；现状为重启后显示上一篇（用户已接受） |

---

## 2. 服务与启动

| 服务 | 端口 | 启动命令（由 `start.ps1` 调用） |
|---|---|---|
| 文件管理器（父页面） | 3000 | `npm run start:file-manager`（`tools/file-manager/start.cjs`） |
| 后端 API | 3001 | `npm run start:server`（`start-server.mjs` → `dist/server.js`） |
| Doocs 代理 + 悬浮面板 | 8800 | `node tools/doocs/server.js` |
| md-cli 子进程（8800 内部上游） | 52269 | 由 `tools/doocs/server.js` 拉起 |

- 启动：`.\start.ps1`，参数 `-Mode full|api|files`。服务输出写入 `logs/<服务名>.out.log` 与 `.err.log`；启动后按端口检查 30 秒。构建失败时不启动服务。
- 停止：使用脚本输出的 PID，`Stop-Process -Id <PID> -Force`。
- 验证：`.\verify.ps1`。
- 控制面板：`CONTROL_PANEL.html`。

---

## 3. 业务流程

**A. 3000 选文 → 8800 编辑器**
1. 打开 3000 文件管理页。文件列表与正文经 `/api/obsidian/list`、`/api/obsidian/file` 读取 Obsidian VAULT 内的 `.md`（仅允许 VAULT 内路径，拒绝路径穿越）。
2. 选择文章并点击填充。父页发送 `obsidian-import`，子页回 `obsidian-import-ack` 后填充编辑器，成功后发送 `obsidian-ready`。父页 3 秒内无 ack 则重载 iframe。
3. 填充协议实现细节见 §4.3。

**B. 8800 顶层悬浮面板**
- 面板只在顶层文档出现（`tools/doocs/server.js` 第 10 行守卫：`window.top !== window` 时不启动）。
- 按钮：`全选`、`复制正文`、`关闭`。
- `复制正文`：勾选且仅勾选 1 篇时，取正文并写入剪贴板；0 篇或多篇时提示。
- 粘贴前须先在 8800 新建一篇空 md。

**C. 8800 顶层发布到草稿箱**
- 在 8800 顶层编辑并确认内容，通过 COSE 扩展发布，需已在 mp.weixin 登录。

**D. 3000 内嵌 8800 发布**
- 未实现，见 §5。当前替代路径为 B + C。

---

## 4. Doocs 集成事实

### 4.1 页面来源
- `tools/doocs/node_modules/@doocs/md-cli/server.js:155` 从 `https://md.doocs.org/` 取 HTML。
- `:160–161` 在 `</head>` 前注入 `/local-storage-adapter.js`。
- 其余静态资源经代理转发到远程 `md.doocs.org`。编辑器代码来自远程官方站点，本地只能改注入脚本与悬浮面板。

### 4.2 Bundle 版本
- 8800 实际服务的入口 bundle：`/static/js/md-index-BLMbB4cV.js`（从 `http://127.0.0.1:8800/` 根 HTML 取得）。
- 磁盘文件 `tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js` 不是服务版本，不能作为依据。
- 服务版入口 bundle 不含 IndexedDB 读写代码，存储逻辑在懒加载 chunk 中。
- 只读副本 `c:\Users\steel\Downloads\md-storage-B8GIogoY.js`，行号以该副本为准。

### 4.3 填充协议（已实现）
- 子页启动时读取 `/api/doocs/import-data`；无内容则输出 `暂存区无新内容`。
- 3000 后端 `lastImportData` 仅在内存（`tools/file-manager/server.js` 第 123 行），重启即清空。
- 代际令牌 `gen` 避免快速切文时的乱序写入。
- iframe 必须保持布局可见（不能 `display:none`），否则 CM6 无法写入。就绪判断使用 `isConnected`，不用 `offsetParent`（`tools/doocs/server.js:123` 的 `guardCM`）。

### 4.4 存储
- 文章列表：浏览器 IndexedDB 库 `doocs-md`（version 4），store `documents`，keyPath `id`。记录字段：`id`、`title`、`content`、`history`、`createDatetime`、`updateDatetime`、`parentId`、`collapsed`。
- 其他 IDB store：`cache`、`meta`、`secrets`、`settings`。
- 当前编辑内容：`localStorage.__editor_content`（VueUse `useStorage`）。后端重启不清空该键，因此重启后显示上一篇。
- 不同浏览器 profile 的 IndexedDB 数据互相独立。
- 内存缓存与删除机制（`md-storage-B8GIogoY.js`，已验证）：
  - 模块级缓存 `K`（约 15269 行）。`X.loadAll()`（约 16562 行）仅在 `K` 为空时从 IDB 填充。
  - `lt(e)`（约 15755 行）逐条 `put` 集合 `e`，并**删除不在 `e` 中的全部 key**，然后 `K = [...e]`。
  - `X.saveAll(e)`（约 16949 行）调用 `lt(e)`；`md-post` 中防抖 500 ms，约 6 处调用。
  - `ut()`（约 15984 行）单篇 `put`，不删除；`savePost`（约 16600 行）走 `ut()`。
  - 结论：绕过 `K` 直接写 IDB 的记录，会在下一次 `saveAll` 时被删除。
  - 未验证：触发 `saveAll` 的完整时机；pagehide 备份路径 `ft` / `lt`（约 16378 行）的触发条件。

### 4.5 8800 注入与代码位置
- `tools/doocs/server.js`：第 10 行顶层守卫；约第 14 行 `selectAllOn`；第 41 行 `btnCopy` 创建；第 85 行 `btnCopy.onclick`；第 123 行 `guardCM`；第 216 行 `execCommand('insertText')`；第 358 行面板注入到 `</body>` 前。
- `tools/file-manager/server.js`：`/api/doocs/import`（第 131 行）、`/api/obsidian/list`（第 182 行）、`/api/obsidian/file`（第 191 行）、`/api/doocs/import-data`（第 206 行，带 8800 的 CORS）、`/api/doocs/storage/*`（第 231 行）。
- `tools/file-manager/public/index.html`：3000 前端，内嵌 iframe `#doocsFrame`（约第 190 行）。

### 4.6 残留组件
- `tools/doocs/local-storage-adapter.js`（约 430 行）：经 `md-cli/server.js:86–92` 提供并注入。
  - 实测（已验证）：`String(indexedDB.open)` 为原生函数；`window.localStorage.setItem === Storage.prototype.setItem`；`indexedDB` 与 `localStorage` 为 getter-only，赋值被忽略。其替换逻辑未生效。
  - 仍生效的部分：`init()` 发起 `GET /api/storage/documents`，实测返回 0 个文档。
- `tools/doocs/local-storage-api.js`（292 行，ESM）：`/api/storage` 路由，由 `md-cli/server.js:21` 导入，`:83` 挂载。数据目录 `tools/doocs/local-storage/documents` 为空。3000 的 `/api/doocs/storage/*` 转发到此；仓库内未找到前端调用方。
- `src/server.ts:153,191`（3001）另有 `/api/storage/*` 路由，调用方未核查。

---

## 5. 3000 内嵌 8800 发布：阻塞

### 5.1 检测机制（已验证）
- 发布弹窗检测的是 **COSE 扩展**提供的 `window.$cose`（扩展 ID `ilhikcdphhpjofhlnbojifbihhfmmhfk`，v1.3.18，路径 `C:\Users\steel\AppData\Local\Google\Chrome\User Data\Default\Extensions\ilhikcdphhpjofhlnbojifbihhfmmhfk\1.3.18_0`）。
- 实际运行的 bundle `ze()`：`window.$cose !== void 0` 则继续，否则每 500 ms 轮询，最多 11 次；失败则显示“未检测到插件”，“确定”按钮置灰。该提示只控制弹窗。
- 发布与账号列表依赖 `window.$cose.getAccounts` 与 `window.$cose.addTask`。
- `$cose` 注入条件（`bundles/content.js` 第 1 行）：页面 origin 为 `https://md.doocs.org`，或 DOM 中存在 `#app` 且包含 `#editor` 与 `#preview #output`（MutationObserver，10 秒超时）。否则不注入 `bundles/inject.js`。
- `manifest.json` 匹配 `http(s)://*/*`，**没有 `all_frames`**，因此 iframe 中不运行 `content.js`。
- `bundles/inject.js`：`window.$cose` 在执行时无条件挂载，没有 origin、DOM 或通信前置检查。唯一的注入门槛是 `content.js` 的 `e()`。
- `addTask(e,t,n)` 对微信：点击当前文档中的复制按钮（`.copy-btn`、`button[class*="copy"]` 或文本“复制”），等待 2 秒，读取 `navigator.clipboard.read()` 的 `text/html`，再发送 `SYNC_TO_PLATFORM`。依赖顶层页面的复制按钮与剪贴板 HTML。

### 5.2 实测（已验证）

| 页面 | `typeof window.$cose` |
|---|---|
| 8800 顶层 | `'object'` |
| 3000 顶层 | `'undefined'` |
| 3000 内嵌 `#doocsFrame` | `'undefined'` |

- 3000 顶层 `document.getElementById('app')` 返回 `null`，与代码推断一致，因此 `content.js` 门槛函数提前返回，不注入。
- 3000 页面不存在 `id="app|editor|preview|output"` 与 `copy-btn`；“复制”仅出现在 alert 文本中。
- 3000 页面中的 `window.$syncer` 属于另一个扩展（`hchobocdmclopcbnibdnoafilagadion` v2.0.9，`all_frames: true`），与发布检测无关。

### 5.3 结论
- 3000 内嵌页无法直接获得 `$cose`（无 `all_frames`）。
- 在 3000 顶层补齐注入门槛后 `$cose` 可以出现，但发布仍需顶层存在可点击的复制按钮并能从剪贴板读到 HTML，二者均未验证，且属于脆弱绕行。
- 当前决定：以 8800 顶层发布为准；3000 内嵌发布保留为目标，状态为未实现。

---

## 6. 已知问题

- 偶发“同步失败”，原因未知。
- 草稿正文需手动“保存草稿”后后端才能看到，原因未知。
- 标题规则：Doocs 从一级标题自动提取，需确认。
- 表格、代码块排版未验证。
- `unset` 代码高亮语言 404（`cdn-doocs…unset.min.js`）。
- GA 请求 `ERR_NAME_NOT_RESOLVED`、`favicon.ico` 404，未确认影响。
- `postMessage` targetOrigin 与 3000 不匹配的警告来自既有 `injectedScript`，不是面板代码。
- 扩展 `hchobocdmclopcbnibdnoafilagadion` 打印 `[Extractor] ... SyntaxError: Unexpected end of JSON input`，不影响流程，来源未定位。
- 终端中文显示乱码（PowerShell 编码），仅显示问题。
- 测试：2026-11-19 记录 `npm test` 3/9 套件失败（源码 `.js` 扩展导入在 Jest 中无法解析），本次未复核。
- Obsidian 导入面板未做项（来自 2026-11-22 落地标准，未验证）：
  - `![[...]]` 图片引用未转换，属已知风险，后续单独评估。
  - 发布回执与“已发布”自动标记未验证，当前仅考虑手动标记；不为测试而发布真实草稿。
  - 面板状态使用 `localStorage`，未采用最初设计的 sidecar JSON；需要写入接口时再评估。
- 微信在 Doocs 中的最终排版兼容性（外部图片、公式、Mermaid、复杂 HTML）未验证；发布仍保留 copy/paste 兜底。

---

## 7. 后端模块（2026-11-18 记录，本次未复核）

- WeChat Token 获取（`/api/wechat/token`）、发布记录（SQLite `db.sqlite`，表 `publish_records`、`audit_logs`、`configs`）、Markdown 渲染、内容验证、文件监听自动发布（监听 Obsidian 目录）。
- 对应代码：`src/services/`、`src/core/`、`src/db/`、`src/server.ts`。
- API 端点以 [SYSTEM_GUIDE.md](SYSTEM_GUIDE.md) 为准（该文档未经验证，使用前需对照 `src/routes/`）。

---

## 8. 独立能力（不在发布链路内）

### 8.1 Vault CLI（已验证，2025-01-15 运行；数据量为当时值，未复核）
- 实现：`src/services/vault-reader.js`（VaultReader）、`src/cli.js`（CLI）。
- 命令（`package.json` 中的 `vault:*` 脚本）：
  - `npm run vault:stats`
  - `npm run vault:list [-- --series "系列名"] [-- --by-series] [-- --sort size|time] [-- --limit N]`
  - `npm run vault:search -- "关键词" [--content]`
  - `npm run vault:extract -- --file "文件名.md" [--output output.md]`
  - `npm run vault:export`
- 元数据由文件路径与正文自动计算，不依赖 frontmatter。

### 8.2 Doocs 基础能力（已验证，2025-01-15，@doocs/md-cli 2.1.3，人工操作）
- Copy 按钮复制微信兼容 HTML，成功通知文案：“Rendered content copied to clipboard. You can paste it directly into the WeChat backend.”
- 左侧 Markdown、右侧实时预览；支持暗黑模式预览。
- 已测语法：一至三级标题、粗体、有序列表、分隔线、引用、链接、代码块、中英文混排。
- 刷新后内容保留（由 `localStorage` 恢复，见 §4.4）。
- 本次记录早于 §3 B 面板与 §5 的调查，不覆盖其中的结论。
