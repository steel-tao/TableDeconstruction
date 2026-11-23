# Doocs → 微信草稿箱：窗口交接

> 用途：切换到新窗口时的交接。只放待决策事项、约定与下一步。
> 当前现状（能力、流程、端口、Doocs 事实、阻塞证据）以 [CURRENT_STATUS.md](../../CURRENT_STATUS.md) 为唯一记录，本文不重复。

---

## 1. 新窗口启动说明

在新窗口中，先把下面这段发给助手：

> 请先阅读 `F:\TableDeconstruction\docs\03-reports\DOOCS_WECHAT_HANDOFF.md`，并按其中的指引阅读 `F:\TableDeconstruction\CURRENT_STATUS.md`。不要重复已验证的探测（见 CURRENT_STATUS §5.2）。当前阻塞是 3000 内嵌 Doocs 的发布不通，发布目标保留、现状未实现。请先与我确认 §3 的两项决策，再决定下一步。未经批准不要改代码、提交、推送或重启服务。

要点：
- 已通：3000 选文章填充编辑器；8800 顶层发布到草稿箱。
- 不通：3000 内嵌 Doocs 发布。“未检测到插件”只是弹窗提示，真正影响的是 `window.$cose` 是否可用。
- 约束：不改 Doocs 打包文件；不运行 `start-p1.ps1`；不读 `.env`；不读文章正文。

---

## 2. 用户约定

- 用户用中文交流，称助手为 Coco。
- 代码改动、提交（commit）、推送（push）、重启服务，均需事先获得用户明确批准。
- 不运行 `start-p1.ps1`（会杀掉 3001 / 3000 / 8800）。
- 不修改 Doocs 打包文件 `tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js`、整个 `node_modules/@doocs/md-cli/`、COSE 扩展文件、`.env`。
- 不读取 `.env`，不读取 Obsidian 文章正文（只能用标题）。
- 结论必须有证据；区分“已验证”与“推测”。
- 文档约定：每条事实只写一处；现状写入 CURRENT_STATUS，交接只写待办与决策；不写流水账。

---

## 3. 目标与待决策事项

- 目标（保留）：在 3000 文件管理页内嵌 8800 完成发布到草稿箱。
- 当前替代路径为 8800 顶层发布。
- 决策 1（待用户）：是否继续推进 3000 内嵌发布。若继续，只能走 §4 的垫片方案，且须先经 Gemini 复核。若不继续，保持 8800 顶层发布为准。
- 决策 2（待用户）：是否删除残留的 `local-storage-adapter.js` 与 `local-storage-api.js`，见 §5.1。删除前须完成 A/B 测试。

---

## 4. 垫片方案（草案，未批准，未实施）

### 4.1 设计

- 在 `tools/file-manager/public/index.html` 中加入隐藏的 `#app > #editor` 与 `#preview #output`，满足 COSE 扩展 `content.js` 第 1 行的门槛，使 `inject.js` 注入到 3000 顶层。
- 加入隐藏的 `.copy-btn`，其点击事件把排版后的正文 HTML 写入剪贴板（或覆盖 `navigator.clipboard.read` 返回该 HTML；须评估合规性与可靠性）。
- 排版 HTML 来源：8800 预览 `#output` 位于跨域 iframe（端口不同），3000 无法直接读取。需由 8800 面板（`tools/doocs/server.js`）经 `postMessage` 提供渲染后的 HTML。此为关键依赖，尚未验证。
- 调用 `$cose.addTask(...)` 发布；`accounts` 取自 `$cose.getAccounts()`，需用户已在 mp.weixin 登录。
- 改动范围：仅 `tools/file-manager/public/index.html` 与 `tools/doocs/server.js`。不修改 Doocs 打包文件。

### 4.2 验证门槛（逐级，任一失败即停止）

- G0（只读）：**已通过**。3000 页面无 `id="app|editor|preview|output"`，无 `copy-btn`；“复制”仅出现在约 371 行的 alert 文本中，不会被 COSE 误匹配。`getAccounts(callback, ids)` 为 async 且返回数组，`await $cose.getAccounts()` 可用。
- G1：加入垫片后，3000 顶层 `typeof window.$cose === 'object'`。
- G2：`await $cose.getAccounts()` 返回 wechat 且 `loggedIn: true`。
- G3：8800 面板能通过 `postMessage` 返回非空 `#output.innerHTML`（跨域读取）。
- G4：点击垫片 `.copy-btn` 后，`navigator.clipboard.read()` 能取到 `text/html`，且内容为排版正文。
- G5：`$cose.addTask` 用测试文章发布，回调返回 `success`，并在微信公众号草稿箱中看到该草稿（用户人工核对）。
- G6：回归：8800 悬浮菜单复制/粘贴与单独发布不受影响。

G1 起需用户在自己的 Chrome 中执行。

### 4.3 风险

- 扩展升级后 `content.js` 门槛或 DOM 检测可能变化。
- `navigator.clipboard.read()` 需要文档焦点与 clipboard-read 权限，程序化点击可能被拒。
- 排版 HTML 跨域同步的时序。
- 整体属于脆弱绕行：多个环节任一失效即整条链路失败。

---

## 5. 残留组件（未裁决）

### 5.1 `tools/doocs/local-storage-adapter.js` 与 `local-storage-api.js`

- 适配器的 `indexedDB` / `localStorage` 替换逻辑已确认未生效（见 CURRENT_STATUS §4.6），仅 `init()` 中的 `GET /api/storage/documents` 仍在运行，实测返回 0 个文档。
- 删除前必须做 A/B 测试：A 为现状；B 为在 `tools/doocs/server.js` 中过滤注入并不挂载 `/api/storage`。两者对比文章列表与启动行为。
- 不得直接删除，因为删除会使注入脚本 404。
- 3000 的 `/api/doocs/storage/*` 与 3001 的 `/api/storage/*` 调用方均未核查，删除前须一并核查。

---

## 6. 下一步

1. 等待用户决定 §3 的决策 1 与决策 2。
2. 若决策 1 为继续：先把 §4.1 方案交给 Gemini 复核；复核通过并获批准后，按 §4.2 逐级验证。
3. 若决策 2 为删除：先完成 §5.1 的 A/B 测试，结果由用户在自己的 Chrome 中确认。
4. 任何代码改动、提交、推送前，先获得用户批准。
