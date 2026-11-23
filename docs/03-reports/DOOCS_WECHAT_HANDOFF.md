# Doocs → 微信草稿箱：交接文档

> 用途：新会话的当前状态与事实依据。只记录当前仍成立的内容，不记录调查过程。

---

## 1. 目标与当前状态

目标：Obsidian 文章 → 8800（Doocs）→ 微信公众号草稿箱，并在 3000 文件管理页内嵌 8800 完成发布。

| 能力 | 状态 |
|---|---|
| 3000 选文章 → 填充内嵌 Doocs 编辑器 | 通过（截图验证，3644 字） |
| 8800 顶层悬浮面板“复制正文”→ 粘贴进编辑区 | 通过（用户验证；需先在 8800 手动新建一篇空 md） |
| 8800 顶层发布到草稿箱 | 通过（用户验证） |
| 3000 内嵌 8800 发布到草稿箱 | **不通，当前阻塞**：内嵌页面中 `window.$cose` 不存在，发布弹窗显示“未检测到插件” |
| 启动显示官方示例文章 | 未实施，用户接受现状（重启后显示上一篇） |

### 1.1 现状业务流程

**A. 3000 选文 → 8800 编辑器（通过）**
1. 打开 3000 文件管理页。列表与正文经 `/api/obsidian/list`、`/api/obsidian/file` 读取 VAULT 内的 `.md`。
2. 选择文章并点击填充。3000 向内嵌 8800 发送 `obsidian-import`；子页回 `obsidian-import-ack` 后填充编辑器，成功后发 `obsidian-ready`。3 秒无 ack 则重载 iframe。
3. 已验证：填充 3644 字。

**B. 8800 顶层悬浮面板（通过）**
1. 直接打开 `http://127.0.0.1:8800/`。面板仅在顶层出现。
2. 按钮：`全选`、`复制正文`、`关闭`。`复制正文` 需勾选且仅勾选 1 篇，正文写入剪贴板。
3. 粘贴前须先在 8800 新建一篇空 md。

**C. 8800 顶层发布到草稿箱（通过）**
1. 在 8800 顶层编辑并确认内容。
2. 通过 COSE 扩展发布，需已在 mp.weixin 登录。已由用户验证。

**D. 3000 内嵌发布（未通，目标保留）**
- 内嵌 8800 中 `window.$cose` 不存在，发布弹窗报“未检测到插件”，见 6.1、6.2。
- 当前替代路径为 B + C。

---

## 2. 用户约定

- 用户用中文交流，称呼助手为 Coco。
- 代码改动、提交（commit）、推送（push）、重启服务，均需事先获得用户明确批准。
- 不运行 `start-p1.ps1`（会杀掉 3001 / 3000 / 8800）。
- 不修改 Doocs 打包文件 `tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js`、整个 `node_modules/@doocs/md-cli/`、COSE 扩展文件、`.env`。
- 不读取 `.env`，不读取 Obsidian 文章正文（只能用标题）。
- 结论必须有证据；区分“已验证”与“推测”。

---

## 3. 运行环境

### 3.1 服务与端口

| 服务 | 端口 | 启动方式 |
|---|---|---|
| 文件管理器（父页面） | 3000 | `npm run start:file-manager` → `tools/file-manager/start.cjs` |
| 后端 | 3001 | `npm run start:server` → `start-server.mjs` → `dist/server.js` |
| Doocs 代理 + 悬浮面板 | 8800 | `node tools/doocs/server.js` |
| md-cli 子进程（8800 的内部上游） | 52269 | 由 `tools/doocs/server.js` 拉起，`node_modules/@doocs/md-cli/index.js` |

### 3.2 8800 的页面来源

- `tools/doocs/node_modules/@doocs/md-cli/server.js:155` 从远程 `https://md.doocs.org/` 取 HTML。
- `:160–161` 在 `</head>` 前注入 `<script src="/local-storage-adapter.js">`。
- 其余静态资源经代理转发到远程 `md.doocs.org`。编辑器代码来自远程官方站点，本地只能改注入脚本与悬浮面板。

### 3.3 关键代码位置

- `tools/doocs/server.js`：8800 代理与悬浮面板。第 10 行顶层守卫（`window.top !== window` 则不启动面板）；约第 14 行 `selectAllOn`；第 41 行 `btnCopy` 创建；第 85 行 `btnCopy.onclick`；第 216 行 `execCommand('insertText')`；第 358 行注入到 `</body>` 前。
- `tools/file-manager/server.js`：3000 后端。`lastImportData` 仅在内存（第 123 行），重启即清空；`/api/doocs/import`（第 131 行）；`/api/obsidian/list`（第 182 行）；`/api/obsidian/file`（第 191 行）；`/api/doocs/import-data`（第 206 行，供 8800 读取暂存内容，带 CORS）。
- `tools/file-manager/public/index.html`：3000 前端，内嵌 iframe 为 `#doocsFrame`（约第 190 行）。

### 3.4 启动显示内容

- Doocs 用 VueUse `useStorage("__editor_content", DEFAULT_CONTENT)` 把编辑内容存在浏览器 `localStorage`，不是 IndexedDB。
- 重启后端不清空该键，所以重启后显示上一篇。用户已接受。若将来要改为官方示例，需在 `tools/doocs/server.js` 的 HTML 代理中注入 `localStorage.removeItem('__editor_content')`，代价是刷新会丢失手动编辑。

---

## 4. Doocs 文件与运行时事实

### 4.1 Bundle 版本

- 8800 实际服务的入口 bundle：`/static/js/md-index-BLMbB4cV.js`（从 `http://127.0.0.1:8800/` 根 HTML 取得，已验证）。
- 磁盘文件 `tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js` **不是服务版本**，不能作为依据。
- 服务版入口 bundle 不含 IndexedDB 读写代码；存储逻辑在懒加载 chunk 中。
- 只读本地副本：`c:\Users\steel\Downloads\md-storage-B8GIogoY.js`（存储模块，行号以该副本为准）。

### 4.2 存储位置

- 文章列表：浏览器 IndexedDB 库 `doocs-md`（version 4），store `documents`，keyPath `id`。
- 记录字段（默认种子记录与官方导入记录一致）：`id`、`title`、`content`、`history`、`createDatetime`、`updateDatetime`、`parentId`、`collapsed`。`history` 为数组，条目字段 `content`、`datetime`。
- 当前编辑内容：`localStorage.__editor_content`。
- 其他 IndexedDB store：`cache`、`meta`、`secrets`、`settings`。
- `localStorage` 其他键：`vueuse-color-scheme`、`locale`。
- 不同浏览器 profile 的 IndexedDB 数据互相独立（用户 Chrome 与共享测试浏览器各自一份）。

### 4.3 内存缓存与删除机制（`md-storage-B8GIogoY.js`）

- 模块级缓存 `K`（约 15269 行）；`st()` 返回 `K`，供 `md-post` 的 Pinia store 使用。
- `X.loadAll()`（约 16562 行）：仅在 `K` 为空时从 IndexedDB `getAll` 填充 `K`，之后直接返回 `K`。存储初始化时调用一次。
- `lt(e)`（约 15755 行）：读取 IDB 全部 key，逐条 `put` 集合 `e`，并**删除不在 `e` 中的全部 key**，然后 `K = [...e]`。
- `X.saveAll(e)`（约 16949 行）调用 `lt(e)`。`md-post` 中 `saveAll` 防抖 500 ms，约 6 处调用。
- `ut()`（约 15984 行）：单篇 `put`，不删除。`savePost`（约 16600 行）走 `ut()`。
- 结论（已验证）：任何绕过 `K` 直接写入 IDB 的代码，其记录会在下一次 `saveAll` 时被删除。
- 未验证：触发 `saveAll` 的完整时机；pagehide 备份路径 `ft` / `lt`（约 16378 行）的触发条件。

### 4.4 禁止修改的文件

- `tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js`
- 整个 `node_modules/@doocs/md-cli/`（上游包，注入链在其 `server.js` 中）

---

## 5. 填充协议（3000 → 8800 内嵌，已实现）

- 父页发送 `obsidian-import`（含 `seq`、`filename`、`content`）给子页。
- 子页收到后立即回 `obsidian-import-ack`，再调用 `fillEditor` 填充 CM6，成功后发送 `obsidian-ready`。
- 父页 `sendImportToDoocs`：3 秒内无 ack 则重载 iframe（`?reload=`）。
- 代际令牌 `gen` 避免快速切文时的乱序写入。
- 子页启动时读取 `/api/doocs/import-data`；无内容则输出 `暂存区无新内容`。
- iframe 必须保持布局可见（不能 `display:none`），否则 CM6 无法写入。判断编辑器就绪使用 `isConnected`，不用 `offsetParent`（`tools/doocs/server.js:123` 的 `guardCM` 使用 `isConnected`）。

---

## 6. 发布链与阻塞

### 6.1 发布检测机制（已验证）

- 发布弹窗检测的是 **COSE 扩展**提供的 `window.$cose`（扩展 ID `ilhikcdphhpjofhlnbojifbihhfmmhfk`，v1.3.18）。
- 扩展路径：`C:\Users\steel\AppData\Local\Google\Chrome\User Data\Default\Extensions\ilhikcdphhpjofhlnbojifbihhfmmhfk\1.3.18_0`。
- 实际运行的 bundle `ze()`：`window.$cose !== void 0` 则继续，否则每 500 ms 轮询，最多 11 次；失败则 `PostInfo` 显示“未检测到插件”，“确定”按钮置灰。
- 该提示只控制弹窗，不是独立故障。
- 发布与账号列表依赖 `window.$cose.getAccounts` 与 `window.$cose.addTask`。`$cose` 缺失时可选链静默失败，账号列表为空。
- `window.$cose` 的注入条件（`bundles/content.js` 第 1 行）：
  - 页面 origin 为 `https://md.doocs.org`，或 DOM 中存在 `#app` 且包含 `#editor` 与 `#preview #output`（MutationObserver，10 秒超时）；否则不注入 `bundles/inject.js`。
  - `manifest.json` 中 `content_scripts` 匹配 `http(s)://*/*`，**没有 `all_frames`**，因此 iframe 中不运行该脚本。
- `$cose.addTask({post, accounts}, onProgress, onDone)`（签名核对：`addTask(e,t,n){let{post:r,accounts:a}=e`）。`accounts` 取 `checked` 为真的项。
- `addTask` 对微信等平台：点击当前文档中的复制按钮（`.copy-btn`、`button[class*="copy"]` 或“复制”按钮），等 2 秒，读取 `navigator.clipboard.read()` 的 `text/html`，再发送 `SYNC_TO_PLATFORM`（内容为 `{title, body, markdown, thumb, desc, wechatHtml}`）。依赖顶层页面的复制按钮与剪贴板 HTML。

### 6.2 `$cose` 实测结果（用户 Chrome，已验证）

| 页面 | `typeof window.$cose` |
|---|---|
| 8800 顶层 | `'object'` |
| 3000 顶层 | `'undefined'` |
| 3000 内嵌 `#doocsFrame` | `'undefined'` |

- 3000 页面内的 `window.$syncer` 存在，但它属于另一个扩展（`hchobocdmclopcbnibdnoafilagadion` v2.0.9，`all_frames: true`），与发布检测无关。
- 3000 顶层无 `$cose` 的原因（代码级，已读 `content.js` 第 1 行）：清单匹配 `http://*/*`，`content.js` 会运行；但门槛函数在页面无 `#app` 元素时立即返回 `false`，`if(!await e())return;` 因此不注入 `inject.js`。3000 页面无 `id="app"`，依据见 6.3.2 的 G0。
- 实测（用户，3000 顶层控制台）：`document.getElementById('app')` 返回 `null`，与代码推断一致。
- `bundles/inject.js` 只读结论：`window.$cose` 在 `inject.js` 执行时无条件挂载，没有 origin、DOM 或通信前置检查；唯一的注入门槛是 `content.js` 的 `e()`。`$cose` 的各方法依赖 `chrome.runtime` 消息通道，`addTask` 才会查找 `.copy-btn` 或含“复制”的按钮并调用 `navigator.clipboard.read()`（读取 `text/html`）。因此若在 3000 顶层补齐 `#app > #editor` 与 `#preview #output` 注入门槛，`$cose` 本身可以出现；但发布仍需在 3000 顶层存在可点击的复制按钮，并能从剪贴板读到 HTML，二者均未验证。

### 6.3 阻塞原因与方案约束

- 阻塞：3000 内嵌的 8800 不是顶层文档，`$cose` 不存在，发布弹窗报“未检测到插件”。
- 用户不接受“打开两个窗口”作为最终方案。
- 方案前需完成：确认 3000 顶层无 `$cose` 的原因；Gemini 复核方案。
- 当前拟定方向（未批准，未实施，待 Gemini 审核）：在 3000 顶层加入最小 DOM 垫片，使 COSE 注入 `$cose`；排版 HTML 由 8800 经 `postMessage` 提供。

#### 6.3.1 3000 顶层垫片设计（草案）

- 在 `tools/file-manager/public/index.html` 中加入隐藏的 `#app > #editor` 与 `#preview #output`，满足 `content.js` 门槛，使 `inject.js` 注入到 3000 顶层。
- 加入隐藏的 `.copy-btn`，其点击事件把排版后的正文 HTML 写入剪贴板（或覆盖 `navigator.clipboard.read` 返回该 HTML；须评估合规性与可靠性）。
- 排版 HTML 来源：8800 Doocs 预览 `#output` 位于跨域 iframe（端口不同），3000 无法直接读取，需由 8800 面板（`tools/doocs/server.js`）经 `postMessage` 提供渲染后的 HTML。此为关键依赖，尚未验证。
- 调用 `$cose.addTask(...)` 发布；`accounts` 取自 `$cose.getAccounts()`，需用户已在 mp.weixin 登录。
- 改动范围：仅 `tools/file-manager/public/index.html` 与 `tools/doocs/server.js`。不修改 Doocs 打包文件。

#### 6.3.2 验证门槛（逐级，任一失败即停止）

- G0（只读）：**已通过**。`tools/file-manager/public/index.html` 中无 `id="app|editor|preview|output"`，无 `copy-btn`；“复制”仅出现在约 371 行的 alert 文本中，不会被 COSE 误匹配。`getAccounts(callback, ids)` 为 async 且返回数组，`await $cose.getAccounts()` 可用。
- G1：加入垫片后，3000 顶层 `typeof window.$cose === 'object'`。
- G2：`await $cose.getAccounts()` 返回 wechat 且 `loggedIn: true`。
- G3：8800 面板能通过 `postMessage` 返回非空 `#output.innerHTML`（跨域读取）。
- G4：点击垫片 `.copy-btn` 后，`navigator.clipboard.read()` 能取到 `text/html`，且内容为排版正文。
- G5：`$cose.addTask` 用测试文章发布，回调返回 `success`，并在微信公众号草稿箱中看到该草稿（用户人工核对）。
- G6：回归：8800 悬浮菜单复制/粘贴与单独发布不受影响。

#### 6.3.3 风险

- 扩展升级后 `content.js` 门槛或 DOM 检测可能变化。
- `navigator.clipboard.read()` 需要文档焦点与 clipboard-read 权限，程序化点击可能被拒。
- 排版 HTML 跨域同步的时序。

---

## 7. 残留组件（未裁决）

### 7.1 `tools/doocs/local-storage-adapter.js`（约 430 行）

- 通过 `md-cli/server.js:86–92` 提供，由 `:160–161` 注入到 `<head>`。
- 代码意图：替换 `window.indexedDB.open`、代理 `localStorage.setItem`，并同步到 `/api/storage`。
- 实测（用户 Chrome，已验证）：`String(indexedDB.open)` 为原生函数；`window.localStorage.setItem === Storage.prototype.setItem` 为 `true`；`indexedDB` 与 `localStorage` 为 getter-only 访问器，赋值被忽略。因此替换逻辑**未生效**。
- 仍有效的作用：`init()` 发起 `GET /api/storage/documents`，日志 `[Obsidian] 从本地存储加载了 N 个文档`（约第 44 行）。实测 N = 0。
- 删除前必须做 A/B 测试（A：现状；B：在 `tools/doocs/server.js` 过滤注入并不挂载 `/api/storage`），不得直接删除，因为删除会使注入脚本 404。

### 7.2 `tools/doocs/local-storage-api.js`（292 行，ESM）

- `/api/storage` 路由，由 `md-cli/server.js:21` 动态导入，`:83` 挂载。
- 数据目录 `tools/doocs/local-storage/documents` 为空目录。
- 3000 的 `/api/doocs/storage/*` 代理（`tools/file-manager/server.js:231`）转发到此；仓库内未找到前端调用方。
- `src/server.ts:153,191`（3001）另有 `/api/storage/*` 路由，调用方未核查。

---

## 8. 8800 悬浮面板（当前版本）

- 当前 `tools/doocs/server.js` 中面板只有：`全选`（`selectAllOn` 切换）、`复制正文`（`btnCopy`）、`关闭`。
- 没有 IDB 直写与导入逻辑（已由代码确认）。
- 复制正文：勾选且仅勾选 1 篇时，`GET /api/obsidian/file?path=` 取正文，`navigator.clipboard.writeText` 写入剪贴板；0 篇或多篇时给出提示。
- 3000 后端 `/api/obsidian/list` 与 `/api/obsidian/file` 仅允许 `VAULT_PATH` 内的 `.md`，拒绝路径穿越，CORS 仅允许 `http://127.0.0.1:8800`。

---

## 9. 其他已知问题（优先级低）

- `unset` 代码高亮语言 404（`cdn-doocs…unset.min.js`）。
- GA 请求 `ERR_NAME_NOT_RESOLVED`、`favicon.ico` 404：未确认影响，未处理。
- `postMessage` targetOrigin 与 3000 不匹配的警告来自既有 `injectedScript`，不是面板代码。
- 扩展 `hchobocdmclopcbnibdnoafilagadion` 的 `[Extractor] Error handling editor message: SyntaxError: Unexpected end of JSON input`：扩展自身 `catch` 后打印，不影响流程，来源（空消息）未定位。
- 偶发“同步失败”，原因未知。
- 草稿正文需手动“保存草稿”后后端才能看到，原因未知。
- 标题规则：Doocs 从一级标题自动提取，需确认。
- 表格、代码块排版未验证。

---

## 10. 历史关键提交

| 提交 | 内容 |
|---|---|
| `e5fc929` | 修复 Doocs 切文竞态，加入就绪握手快速路径 |
| `49c662f` | 通过 `tools/doocs/server.js` 代理启动 Doocs |
| `e19aed3` | 移除隐藏 iframe，`offsetParent` → `isConnected`，导入错误改为 alert |
| `d976b0f` | 8800 悬浮面板改为“复制正文”，移除 IDB 直写 |
| `494a914` | 清理 55885 时代启动残留，记录启动链 |

注意：`0fd1f0e` 引入过 `display:none`，已在 `e19aed3` 中移除。

---

## 11. 下一步

1. 3000 顶层无 `window.$cose` 的原因已确定（见 6.1，`#app` 缺失已实测）。`$cose` 能否在垫片下出现已可判定；发布链在 3000 顶层能否跑通（复制按钮、剪贴板 HTML、跨源取 8800 渲染内容）仍未验证，且属于脆弱绕行，需用户决定是否继续。
2. 经 Gemini 复核 6.3.1 的垫片方案，然后按 6.3.2 的门槛逐级验证（G1 起需用户在自己的 Chrome 中执行）。
3. 删除 `local-storage-adapter.js` / `local-storage-api.js` 前，完成 7.1 的 A/B 测试；重启由用户自行执行验证。
4. 任何代码改动、提交、推送前，先获得用户批准。
