# Doocs → 微信草稿箱：交接文档

> 用途：新开会话时的完整上下文。接手者请先读完本文，再动手。
> 已提交基线：`e19aed3`（main，已推送 origin）。本文件尚未提交。

---

## 1. 目标与现状一句话

从 3000 文件管理页选择 Obsidian 文章 → 内嵌 Doocs 编辑器（8800）→ 发布到微信公众号草稿箱。

| 环节 | 状态 |
|---|---|
| 3000 选文章 → 填充 Doocs 编辑器 | 已验证通过（见 §4） |
| 8800 单独打开，发布到草稿箱 | 已验证可通（用户结论） |
| 3000 内嵌 Doocs，发布 | **不通，当前阻塞** |
| 启动显示官方示例 | 未实施，接受现状（见 §5） |

---

## 2. 用户约定（必须遵守）

- 用户用中文交流，称呼助手为 Coco。
- **代码改动必须先获批准**，提交（commit）和推送（push）也需要明确同意。
- **不得重启服务**（3000/8800/3001），除非用户明确授权。`start-p1.ps1` 会杀掉 3001/3000/8800 进程，禁止运行。
- **不修改 Doocs 打包文件**：`tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js`。
- **不修改** `start-p1.ps1`、`index-old.html`、后端路由。
- **不读取、不打印、不存储 `.env`**（含密钥）。
- **不读取 vault 文章正文**，只能用标题。
- 用户对“重复排查”很敏感：已确认的结论不要重新探测，先读本文。
- 用户偏好：直接、简明、不要模糊的“可能”。区分“已验证”与“推测”。

---

## 3. 架构与关键文件

- 父页面（3000）：`tools/file-manager/server.js`（后端，`lastImportData` 仅内存，重启清空）；`tools/file-manager/public/index.html`（前端，iframe 为 `#doocsFrame`，消息协议见 §6）。
- Doocs 代理（8800）：`tools/doocs/server.js`。对 `/` 返回的 HTML 在 `</body>` 前注入脚本（约第 258 行），脚本以 `[Obsidian Init]` 打日志，包含 `writeCM`、`probeOk`、`guardCM`、`tryFill`。
- 端口与来源：父页 `http://127.0.0.1:3000`；Doocs `http://127.0.0.1:8800`。CORS 只允许 8800。
- 扩展：Chrome 中的“文章同步助手”v2.0.9，ID `hchobocdmclopcbnibdnoafilagadion`，提供 `window.$syncer`，清单中 `all_frames: true`。
- **发布弹窗真正检测的是另一个扩展 COSE**：ID `ilhikcdphhpjofhlnbojifbihhfmmhfk` v1.3.18，路径 `C:\Users\steel\AppData\Local\Google\Chrome\User Data\Default\Extensions\ilhikcdphhpjofhlnbojifbihhfmmhfk\1.3.18_0`，提供 `window.$cose`。其 `bundles/content.js` 匹配 `http(s)://*/*` 但**没有 `all_frames`**，只在顶层文档运行。

---

## 4. 已验证结论（不要重复探测）

1. **填充链路通过**（用户截图）：修复前 50 次全部失败（原因：iframe 为 `display:none`，CM6 无法测量/聚焦）；去掉 `display:none` 并把 `offsetParent` 改为 `isConnected` 后，选 03 制衡篇，控制台出现 `CM6 输入管线写入成功`、`内容填充成功，内容长度: 3644`，编辑器显示该文章，字数一致。前面约 20 次“编辑器未就绪”是启动耗时，属于正常等待，日志文案有误导性但不影响结果。
2. **重启后显示上一篇**：Doocs 用 VueUse `useStorage("__editor_content", DEFAULT_CONTENT)` 把内容存在浏览器 `localStorage`（不是 IndexedDB，之前的说法已更正）。重启后端不会清空它。用户已接受此现状。
3. **“未检测到插件”的真实来源（已验证）**：实际运行的 bundle `md-index-BLMbB4cV.js`（见 §11 22:33）中，`ze()` 检测 `window.$cose !== void 0`，最多轮询 11 次。`$cose` 由 COSE 扩展提供，只在顶层文档注入。8800 顶层 `typeof window.$cose` 为 `'object'`（用户 Chrome 实测）；3000 内嵌 iframe 中缺失。提示只控制弹窗与“确定”按钮，不是独立故障。
4. **发布的真正依赖（已验证）**：发布与账号列表调用 `window.$cose?.getAccounts`、`window.$cose?.addTask`。`$cose` 不存在时可选链静默失败，账号列表为空。
5. **`$syncer` 不是发布检测依据**：文章同步助手（`$syncer`）在 iframe 中存在（截图 A），但与弹窗检测无关。旧版 §4.3/§4.4/§4.5 中关于 `$syncer` 的结论已作废（见 §11 22:33 更正）。
6. **内置浏览器没有该扩展**，不能用来复现发布问题。`openBrowserPage` 打开 3000 能读到文件列表，但 iframe 停在 “Loading editor...”。此结果只说明页面能加载，不代表发布功能。

---

## 5. 产品决策

- **方向 1（启动显示官方示例）**：原定目标，**当前未实施**。用户确认接受现状（重启后显示上一篇）。若以后要实施：在 `server.js` 的 HTML 代理中于 `<head>` 注入 `localStorage.removeItem('__editor_content')`，代价是刷新会丢失手动编辑。
- **方向 2（文章状态标记 未处理/处理中/已处理，并恢复最后处理的文档）**：后续强化，记录在 [PRODUCT_DESIGN.md](/F:/TableDeconstruction/docs/02-design/PRODUCT_DESIGN.md)。待定：存储位置（frontmatter 需授权，侧车 JSON 需处理移动重命名）、恢复规则、文档与文件的归属校验。
- **当前主线**：打通 Doocs → 微信草稿箱。

---

## 6. 填充协议（已实现，勿随意改动）

- 父页发 `obsidian-import`（含 `seq`、`filename`、`content`）给子页。
- 子页收到后立即回 `obsidian-import-ack`，然后 `fillEditor` 填充 CM6，成功后发 `obsidian-ready`。
- 父页 `sendImportToDoocs`：3 秒内无 ack 则重载 iframe（`?reload=`）。
- 代际令牌 `gen`：避免快速切文的乱序写入。
- 子页启动时读取 `import-data` 接口（后端 `tools/file-manager/server.js`），无内容则输出 `暂存区无新内容`。

---

## 7. 当前阻塞：3000 内嵌发布不通（根因已定位，修复方案待定）

**根因（已验证）**：发布弹窗检测 `window.$cose`（COSE 扩展，仅顶层注入）。8800 顶层 `$cose` 为 `'object'`；3000 内嵌 iframe 中 `$cose` 缺失，弹窗显示“未检测到插件”。`$syncer` 存在与否不影响该结论。

**已排除**：`$syncer` 注入时序（§11 22:47 探针，`$syncer` 在 1.7 秒出现，`$cose` 全程缺失）；`$syncer` 扩展注入 iframe 的能力（其 manifest `all_frames: true`）。

**已验证（用户 Chrome，23:06:22）**：3000 顶层页面 `typeof window.$cose` 为 `'undefined'`。因此父页（3000）同样无法调用 `$cose`，§7 原“父页调用 `$cose` 的单窗口方案”不成立。COSE 的 `content.js` 清单匹配 `http://*/*`，但 3000 顶层仍无 `$cose`，原因未确定（待查：扩展对该站点的访问权限、页面加载早于扩展启用、或注入条件）。

**约束**：用户不接受“打开两个窗口”作为最终方案（会绕回双窗口流程）。修复须在 3000 单窗口内完成，但具体方案尚未确定，需用户批准后再动代码。

**待办**：
1. 3000 顶层 `typeof window.$cose` 已回报为 `'undefined'`（见上方“已验证”）。单窗口方案需先查明 3000 顶层为何无 `$cose`，再决定方案，需用户批准。
2. 探针已于 23:2x 删除：`tools/doocs/server.js` 与提交版本一致（`git diff` 无差异），8800 已重启（新 PID 44128），HTTP 200，返回页面不含 `Obsidian Probe`。


---

## 8. 其他已知问题（优先级低）

- `unset` 代码高亮语言 404（`cdn-doocs…unset.min.js`），可能影响代码块显示。
- 偶发“同步失败”，原因未知。
- 草稿正文需要手动“保存草稿”后后端才能看到（原因未知）。
- 标题规则：Doocs 会从一级标题自动提取，需确认。
- 启动后 Doocs 的 GA 请求 `ERR_NAME_NOT_RESOLVED`、`favicon.ico 404`：未确认是否影响功能，暂未处理。
- 表格、代码块的排版效果未验证。

---

## 9. 历史关键提交

- `e5fc929`：修复 Doocs 切文竞态，加入就绪握手快速路径。
- `49c662f`：通过 `tools/doocs/server.js` 代理启动 Doocs。
- `e19aed3`（当前基线）：移除隐藏 iframe 与占位，`offsetParent` → `isConnected`，导入错误改为 alert，新增产品设计文档。
- 注意：`0fd1f0e` 引入了 `display:none`，无文档记录其理由，用户已确认应移除。

---

## 10. 新会话的第一步

1. 读本文 §4、§7。
2. 不要重新做 §4 已验证的探测。
3. 向用户索要 §7 第 1 步的截图，据此决定下一步。
4. 任何代码改动先提出方案，等批准。

---

## 11. 调查日志（每步更新，按时间追加）

### 2026-11-22 B+D 实施：移除 IDB 直写，改为“复制正文”
- 裁决（用户）：选 B + D，暂缓 C。
  - D：移除 `runImport` / `putRecord` / `openDb` / `computeStatuses` / `loadMap` / `saveMap`，面板不再写 `doocs-md` / `documents`。
  - B：新增“复制正文”按钮（`btnCopy`）。勾选且仅勾选 1 篇时，`GET /api/obsidian/file?path=` 取正文，`navigator.clipboard.writeText` 写入剪贴板；0 篇或多篇时给出提示。
- 已执行：`tools/doocs/server.js` 仅此文件被修改。`node --check` 通过。
- 已执行：8800 重启（新 detached 进程，shellId `doocs8800c`）。`GET http://127.0.0.1:8800/` 返回 200；HTML 含“复制正文”，不含 `runImport` / `putRecord`。
- 已证实（代码）：`render()` 不再引用 `statuses`；`loadList()` 仅调用 `fetchJson(API + '/list')`。
- 待测（用户执行）：勾选 1 篇 → 点“复制正文” → 看顶部提示 → 在 Doocs 编辑器中粘贴 → 确认粘贴内容完整，并从 8800 发布。
- 未验证：剪贴板写入在用户浏览器中是否成功；粘贴进编辑器后的渲染是否与原文一致。
- 未做：方案 C（合成 `paste` 注入编辑区）暂缓。
- 红线：未修改 Doocs 打包文件，未运行 `start-p1.ps1`，未读 `.env` 或文章正文，未提交、未推送。

### 2026-11-21 20:24–20:31（新窗口）
- **截图 A（§7 第 1 步）**：在 3000 的 Console 中把 context 切到 `doocsFrame`，执行 `window.$syncer`，返回对象。包含 `versionNumber: 1001`、`dev: true`、`addTask`、`getAccounts`、`magicCall`、`startInspect`、`updateDriver`、`uploadImage`。
  - 结论：`$syncer` 在 iframe 中存在，扩展注入正常。§7 的“返回 undefined”分支已排除。
- **截图 B（§7 第 2 步）**：点击“发布”后弹窗显示“未检测到插件，请安装 COSE 文章同步助手浏览器扩展”，“确定”按钮置灰。
  - 结论：弹窗没有渲染账号列表。这是 `PostInfo` 的插件未检测分支，不是 `getAccounts` 回调为空。§7 第 2 步的判断依据不成立，需要修正。
- **矛盾点（已验证）**：`$syncer` 在 20:24 与 20:25 的控制台查询中都存在，但 UI 的检测状态仍是“未检测到”。说明 `PostInfo` 的检测在挂载时已经判定为失败，之后再出现的 `$syncer` 不会被重新检测。
- **待查（只读）**：Doocs 打包文件中“未检测到插件”分支的判断条件，以及 `T()` 的轮询与超时逻辑。不修改该文件。

- **截图 C（发布弹窗）**：弹窗显示“未检测到插件”，“确定”按钮置灰，没有账号列表。

### 20:31 只读检查 Doocs 打包文件（未修改）
文件：`tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js`（压缩代码，搜索 `未检测到插件` 与 `window.$syncer`）。
- `T()`（插件检测）逻辑：
  1. 挂载前（`onBeforeMount`）同步检查 `window.$syncer !== void 0`。存在则 `s = true` 并返回。
  2. 不存在则每 500ms 轮询，最多 11 次（约 5.5 秒）。轮询成功时设置 `s = true` 并调用 `p()`；11 次都失败则 `s` 保持 `false`，之后不再检测。
- `s` 控制“未检测到插件”提示和“确定”按钮的可用性。
- `p()`：`window.$syncer?.getAccounts(...)` 填充账号列表。

**更正（20:33）**：此前“`$syncer` 晚于 5.5 秒窗口注入”的假设未经验证，并且与 §7 已记录的结论冲突（§7 写明“挂载时序解释无法解释失败”）。该假设作废，不作为根因。上面 T() 的代码事实仍然成立，但它不能说明为什么截图 A 中 `$syncer` 已存在而 UI 仍为未检测。

### 状态
- 没有可靠的根因，也没有经过验证的修复方案。
- 不再提出代码改动方案，直到根因被观测证实。
- 下一步需要明确的问题：`s` 在哪个时刻被设为 `false`，以及 `T()` 的 `window.$syncer` 检查在哪个上下文、哪个时间点执行。这需要读取 `PostInfo` 挂载与 `T()` 调用的完整代码，或由用户批准的一次观测。

### 20:41 备注
- Gemini 的总结是对上一个窗口验证过程的回顾，其中的时间戳（如 17:32）属于上一个窗口，不与本窗口截图（20:xx）对照。
- 只读核对：`tools/doocs/server.js`、`tools/file-manager/public/index.html`、`tools/file-manager/server.js` 中已无 `offsetParent` 判断，仅剩 `isConnected`（如 server.js:123、134）。总结中“隐藏态 offsetParent 残留”一条与当前文件不符，待确认是否为旧信息。

### 20:47 只读检查：`PostInfo` 中 `s` 的来源
- `tools/doocs/server.js` 与 `tools/file-manager/public/index.html` 中无 `$syncer`、`cose`、`getAccounts`、`addTask`、“插件”相关代码，我们的代码不参与插件检测。
- Doocs 打包文件中，`PostInfo` 的 `s = ref(false)` 只在 `T()` 内被设为 `true`（`s.value=!0`）。没有其他路径能改变 `s`。
- `T()` 在 `onBeforeMount` 执行一次：`$syncer` 存在则立即置 `true`；否则每 500ms 检查一次，最多约 11 次（约 5.5 秒），之后不再检查。
- 因此“未检测到插件”的唯一来源是：挂载后的这一次检测窗口内，`window.$syncer` 没有出现在 `T()` 所在的 `window` 中。
- 截图 A 证明 `$syncer` 之后在 `doocsFrame` 中存在，但不能证明它在检测窗口内存在。
- **未验证**：`PostInfo` 的挂载时间点，以及 `T()` 所在 `window` 与控制台 `doocsFrame` 是否是同一个。这两点需要运行时观测才能确定。

### 21:08 已执行：诊断钩子
- 改动：[server.js](F:/TableDeconstruction/tools/doocs/server.js) 第 72 行后新增 `[Obsidian Probe]` 日志钩子（仅记日志，不改已有逻辑）。
- 重启：仅停止并重新启动 8800 的 `node tools/doocs/server.js`（新 PID 22268）。未运行 `start-p1.ps1`，未重启 3000、3001。
- 验证：`http://127.0.0.1:8800/` 返回 200，HTML 含 `Obsidian Probe`。
- 待办：刷新 3000，贴出两行 `[Obsidian Probe]` 日志，与 `api ready`、`CM6 已挂载` 的时间对照。

### 21:13 探针结果（同一次加载，用户提供的控制台）
- `[Obsidian Probe] "发布"按钮首次出现，距脚本启动(ms)= 4870`
- `api ready`（扩展 inject-api.js）
- `[Obsidian Probe] window.$syncer 首次可见，距脚本启动(ms)= 4921`（比按钮晚约 51ms）
- `CM6 已挂载，发送 obsidian-ready`
- 推论（未验证）：`$syncer` 出现在 `T()` 的 5.5 秒检测窗口内，因此“窗口错过 `$syncer`”不能解释本次加载。下一步需要点击发布后的弹窗截图，确认是否仍显示“未检测到插件”。

### 22:33 探针结果与重大更正（同一次加载）
- 截图：“发布”按钮 2743ms，`window.$syncer` 2801ms；点击“发布”20338ms，点击前 DOM 中“未检测到插件”为 `false`，点击时 `window.$syncer` 为 `object`；弹窗“未检测到插件”出现于 20356ms（距点击 18ms）。
- **更正（重要）**：此前所有 `T()` 分析都基于磁盘文件 `tools/doocs/node_modules/@doocs/md-cli/dist/static/js/md-index-Cl1Uh28s.js`。该文件不是浏览器实际加载的版本。
- 8800 通过子进程 `md-cli index.js port=52269` 提供页面。页面引用 `/static/js/md-index-BLMbB4cV.js`，磁盘上不存在该文件；`Cl1Uh28s` 在 52269 上返回 404。
- 实际运行的版本（BLMbB4cV，已通过 HTTP 读取验证）中：
  - 插件检测使用 `window.$cose`，不是 `window.$syncer`。函数 `ze()`：`if (window.$cose !== void 0) {...}`，否则每 500ms 轮询，最多 11 次。
  - 包内搜索不到“未检测到插件”字符串，文案可能来自 i18n 资源，尚未定位。
- 因此探针一直记录的是错误的全局变量（`$syncer`）。`$syncer` 存在不能说明实际检测使用的 `$cose` 是否存在。
- 待办（需用户批准）：探针增加 `typeof window.$cose` 的记录，并记录 `ze()` 执行时的 `$cose` 状态。

### 22:44 探针改动（已执行）
- 仅修改 `tools/doocs/server.js` 探针段：同时记录 `typeof window.$cose` 与 `typeof window.$syncer`。
  - 脚本启动时输出一次；每 20ms 轮询，分别记录两者首次可见的时刻（最多 60 秒）。
  - 点击“发布”（捕获阶段）与弹窗出现“未检测到插件”时，均输出两者的当前状态。
- 仅重启 8800，新 PID 26152；HTTP 200，页面包含新探针。未重启 3000、3001，未运行 `start-p1.ps1`。
- 待办：用户刷新 3000、点击一次“发布”，贴出 `[Obsidian Probe]` 日志。

### 22:47 探针结果（用户实测，同一次加载内对照）
- 脚本启动：`typeof $cose = undefined`，`typeof $syncer = undefined`。
- `$syncer` 在约 1740ms 出现，为 `object`；“发布”按钮约 1713ms 出现。
- `$cose` 全程未出现（启动、点击、弹窗出现时均为 `undefined`）。
- 点击与弹窗出现相差约 18ms（同一次加载）。

### 只读定位：`$cose` 的来源与缺失原因
- 设置 `window.$cose` 的是另一个扩展：`ilhikcdphhpjofhlnbojifbihhfmmhfk/1.3.18_0`（COSE - 多平台文章同步，`bundles/inject.js`，`window.$cose={...}`）。
- 之前查到的 `hchobocdmclopcbnibdnoafilagadion`（`window.$syncer`）与 `$cose` 无关。
- 该扩展 `manifest.json` 中：
  - `content_scripts` 的 `bundles/content.js`（负责注入 `inject.js`）匹配 `http://*/*`、`https://*/*`，**没有 `all_frames`**，即默认只在顶层文档运行。
  - 只有 `sspai-logout-frame.js` 这一条设置了 `all_frames: true`，且仅匹配 `https://sspai.com/robots.txt`。
- 结论：3000 内嵌的 8800 iframe 不是顶层文档，COSE 的 `content.js` 不会在其中运行，因此 `window.$cose` 不存在。
- 服务端 bundle（`md-index-BLMbB4cV.js`）的 `ze()` 只检测 `window.$cose`，所以弹窗显示“未检测到插件”。这与探针结果一致。
- 与之相符的是：8800 顶层页面上 `$cose` 存在，因此单独发布可用。（该点为推断，尚需在 8800 顶层页面验证 `typeof window.$cose`。）
- 注意：`$syncer` 存在并不代表 COSE 可用，检测的是 `$cose`。
- 补充核对：`hchobocdmclopcbnibdnoafilagadion` 的 `manifest.json` 第 15 行为 `all_frames: true`，因此 `$syncer` 能进入 iframe，与探针一致。
- 8800 顶层页面核对（Playwright 内置浏览器）：`top=true`，`typeof $cose = undefined`，`typeof $syncer = undefined`，页面无 COSE 扩展节点。该浏览器未加载 COSE 扩展，**结果不能代表用户 Chrome**，因此“顶层 `$cose` 存在”仍未验证。
- 用户在自己的 Chrome 中核对（已验证）：8800 顶层页面 `typeof window.$cose` 为 `'object'`（刷新前后均为 `'object'`，截图佐证）。
- 结论：`$cose` 在顶层页面存在，在 3000 内嵌 iframe 中缺失。推断成立，根因闭环。
- 待决定：收尾方案（删除探针、只重启 8800，并更新 §7）及“8800 顶层页面发布”的采用方式。

- 23:2x 删除探针：`tools/doocs/server.js` 恢复为提交版本（`git diff` 无差异），仅重启 8800（新 PID 44128，HTTP 200，页面不含 `Obsidian Probe`）。3000 与 3001 未重启。
- 未决：3000 顶层无 `$cose` 的原因，以及单窗口发布方案，待用户决定。
- 23:36 只读核实（共享 Playwright 浏览器中的 8800 页面，未写入任何数据）：
  - 文档列表存于 IndexedDB 库 `doocs-md`（version 4）的 `documents` 存储，keyPath 为 `id`，记录字段：`id`、`title`、`content`、`history`、`createDatetime`、`updateDatetime`、`parentId`、`collapsed`。当前 1 条记录（标题 `Content 1`）。
  - 其他存储：`cache`（空）、`meta`、`secrets`、`settings`。`localStorage` 只有 `vueuse-color-scheme` 与 `locale`，没有文档内容。
  - 页面已有 `input[type=file]`，但 `accept` 仅限图片，且 `multiple=true`，不能直接导入 Markdown。
  - 未验证：用户 Chrome 中的数据是否与此一致（共享浏览器与用户 Chrome 是不同 profile）。用户截图中的“内容1”侧栏在共享浏览器的 DOM 中不存在。
  - 08:28 用户 Chrome 控制台结果（只返回 id 与计数，未读正文）：`documents` 共 1 条，id 为 `1fc73d73-…`，与共享浏览器的 `e43fbd83-…` 不同，确认两者是不同 profile 的独立数据。
- 23:29 用户提出：能否把 Obsidian 文件批量导入 8800，并质疑技术路线。只读分析结论：批量导入只解决“搬运文章”，不解决发布。发布依赖顶层页面的 `$cose`，而 8800 顶层有、3000 顶层无。若 8800 顶层直接读取 Obsidian 文件列表（3000 的 `import-data` 已有 CORS 先例），则 3000 不再参与发布路径，可降为一个窗口。方案待用户批准；8800 当前 bundle 使用 `localStorage` 存编辑内容，文档列表的具体键未核实。
- `http://127.0.0.1:3000/` 顶层：`typeof window.$cose` = `'undefined'`。
- 结论：`$cose` 只在 8800 顶层存在，在 3000 顶层与 3000 内嵌 iframe 中都不存在。父页调用 `$cose` 的单窗口方案不可行，除非先解决 3000 顶层无 `$cose` 的原因。
- 未确定：COSE 清单匹配 `http://*/*`，3000 顶层却无 `$cose`，原因待查。

### 21:20 错误 `[Extractor] Error handling editor message: SyntaxError: Unexpected end of JSON input` 的来源（只读）
- 来源：Chrome 扩展 `hchobocdmclopcbnibdnoafilagadion/2.0.9_0/assets/extractor.ts-ysAklU8v.js`。
- 扩展在 `window` 上注册 `message` 监听器，对每条消息执行 `typeof q.data=="string" ? JSON.parse(q.data) : q.data`，外层 `try/catch` 后用 `xt.error("Error handling editor message:", I)` 打印。
- 收到空字符串的 `postMessage` 时会触发 `Unexpected end of JSON input`。
- 我们的代码（`tools/` 下，排除 `node_modules`）未发现 `postMessage('')` 或 `postMessage(e.data)` 类调用，因此空消息来源未确定，可能来自 Doocs 或其他页面脚本。
- 结论：该错误被扩展自己 `catch` 住，只是一条日志，不影响 `START_SYNC` 流程。它与“未检测到插件”的检测（`window.$syncer`）无关，不作为根因。

### 09:0x 只读核实与用户决定（已记录，勿重复确认）
- 已验证：8800 当前服务的入口 bundle 为 `/static/js/md-index-BLMbB4cV.js`，从 `http://127.0.0.1:8800/` 根 HTML 取得。磁盘上的 `md-index-Cl1Uh28s.js` 不是服务版本，不能作为依据。
- 已验证：服务版入口 bundle 中搜索 `indexedDB`、`doocs-md`、`objectStore(`、`.getAll(`、`onversionchange`，匹配 0 处。文档列表的 IndexedDB 读写代码不在入口 bundle 中，位置未定。
- 未完成：对全部已服务 chunk 的扫描被中途停止，结果不可用作结论。
- 未验证：`documents` 是否只在页面加载时读取（导入后是否需要刷新才可见）。
- 已验证的数据结构见 23:36 与 08:28 两条记录，不需再核实。
- 用户决定（方案定稿输入，尚未实施，代码改动仍需用户批准）：
  1. 导入动作放在 8800 顶层页面；3000 后端只提供只读接口（需运行，但不作为操作窗口）。
  2. 入口为 8800 顶层角落悬浮按钮，点击展开面板；不做启动时自动全量导入。
  3. 重复导入以 Obsidian 相对路径为键：未改动则跳过；已改动则询问“覆盖 / 新建 / 跳过”，默认不覆盖 8800 中已编辑的内容。
  4. 状态记录用项目目录下的 sidecar JSON，不写入 Obsidian 源文件。
  5. Obsidian `![[...]]` 图片引用列为已知风险，本轮不实现。
  6. 发布回执：先做轻量状态（已导入 / 未发布 / 已发布，可手动标记）；真实发布回执探测仅在用户明确同意发一篇真实文章时进行。
  7. 批准范围：`tools/file-manager/server.js` 新增只读接口，并重启 3000；仍禁止改页面布局、预览栏、既有路由、`start-p1.ps1`、`index-old.html`、Doocs 打包文件与 COSE 扩展配置。
- 设计文档落点：`docs/02-design/DOOCS_LOCAL_DEPLOYMENT.md`（尚未更新）。

### 09:1x 导入面板实现与浏览器验证（已记录，勿重复确认）
- 已改动：`tools/file-manager/server.js` 新增只读 `GET /api/obsidian/list`、`GET /api/obsidian/file`（仅 `VAULT_PATH` 内 `.md`，拒绝路径穿越，CORS 仅 `http://127.0.0.1:8800`）。3000 已重启（PID 52164），HTTP 验证通过。
- 已改动：`tools/doocs/server.js` 新增 `obsidianPanelScript`，仅 `window.top === window` 时生效，注入到 8800 根 HTML。8800 已重启（PID 73716，md-cli 子进程端口 52269）。
- 已验证：刷新 8800 根 HTML 后 DOM 中存在 `导入 Obsidian` 按钮与面板脚本（需用新查询串 `?panel=N`，普通刷新不生效）。
- 已验证：面板列出 `VAULT_PATH` 下 15 篇 `.md`，状态显示 新 / 已导入 / 源已更新。
- 已验证：导入 1 篇（`系统相关：.md`，70 字符）后，IndexedDB `doocs-md` `documents` 计数由 1 变为 2，新记录 `title`、`content` 长度与源一致，映射写入 `localStorage` `obsidian-import-map`。
- **已观察（仅共享测试 profile）：刷新页面后，面板直写的记录消失。** 刷新（`?panel=2`）后 `documents` 只剩 `Content 1`，`obsidian-import-map` 仍保留该文件映射，面板会误报“已导入”。原因未定，见下方降级结论。
- 未知：删除发生在页面加载时，还是别处。服务版 `md-index-BLMbB4cV.js` 不在 `tools/doocs/node_modules/@doocs/md-cli/dist` 下，无法在该目录按字符串定位，本轮未继续追查。
- 结论（已降级）：上条“直写会丢”只在共享测试 profile（`e43fbd83-…`）上观察到，**不能推广**。原因未知，“8800 会在加载时覆盖库”仅是未验证假设。
- 用户截图（用户自己的 Chrome，profile `1fc73d73-…`）已验证：通过 8800 顶层“文件 → 导入”导入 2 篇文章，列表显示 3 篇（`内容1`、`01 1000人手工…`、`03 制衡篇…`），按 F5 后仍在左侧内容区，**官方导入持久化正常**。
- 两个 profile 的 `documents` 不同，共享测试 profile 只有 `Content 1`，因此无法直接用截图比较两者的写入结构。
- 待核实（只读，仅字段名与长度）：在用户 Chrome 中读取官方导入记录的字段集合，与面板写入的字段集合对比。
- 已核对（用户 Chrome，只读脚本，仅字段数与标题）：官方导入后的 3 条记录（`内容1`、`01 1000人手工…`、`03 制衡篇…`）每条 `keys` 长度均为 8，`parentId` 均为 `null`。完整字段名与 `historyKeys` 输出被截断，未能逐一确认。
- 差异（代码对照，已验证）：`tools/doocs/server.js` 约第 99–107 行 `putRecord` 写入 7 个字段：`id, title, content, history, createDatetime, updateDatetime, parentId`，**缺少 `collapsed`**。共享 profile 的默认种子记录含 `collapsed`，官方记录为 8 字段。这是目前唯一可见的结构差异，但**尚未证明它导致刷新丢失**。
- 已读（只读，共享测试 profile，仅字段名与长度，未读正文）：`documents` 仅 1 条默认记录 `Content 1`，字段为 `collapsed, content, createDatetime, history, id, parentId, title, updateDatetime`；`id` 为字符串；`history` 为数组（长度 1），条目字段为 `content, datetime`；`parentId` 为 `null`。该记录是默认种子，不是官方导入记录，不能作为官方导入结构的对照。
- 测试清理：已删除测试映射 `obsidian-import-map`（共享测试浏览器 profile）。`系统相关：` 记录已不存在，无需删除。
- 已改动（经你批准 `approve_collapsed`）：`tools/doocs/server.js` 的 `putRecord` 写入补充 `collapsed: false`，仅此一处。8800 已重启（新父 PID 36088，md-cli 子进程 PID 36388，端口 52269）。HTTP 验证 `GET /` 返回 200。
- **已验证（用户自己的 Chrome，8800 页面 `?panel=3`，用户截图）**：导入前左侧 3 篇；面板导入 1 篇后 4 篇；F5 刷新后仍为 4 篇（`内容1`、`01 1000人手工…`、`03 制衡篇…`、`02 跨界篇…`）。刷新保留正常。
- **更正**：刷新保留与 `collapsed` 字段无关。此前把共享测试 profile 的丢失归因于字段缺失，证据不足，不能成立。共享测试 profile 的丢失原因仍未知，但不再阻塞导入功能，也不作为依据。
- 已决定（用户 2026-11-22 10:20）：保留 `collapsed: false`。它与官方记录的 8 字段结构一致，未发现副作用（4 篇文章刷新后正常显示）。不是刷新保留的原因。
- 未做：真实发布、提交、推送。未改 Doocs 打包文件、布局、预览栏、`start-p1.ps1`、`index-old.html`、`.env`、COSE 配置。

### 11:xx 用户反馈“全部导入”无效（只读 + 共享测试页复现）
- 用户报告：点“导入 Obsidian”后选“全部导入”，悬浮面板消失，文件未导入。
- 已核对代码（`tools/doocs/server.js`）：面板**没有“全部导入”按钮**，只有 `全选`、`导入所选`、`关闭`。再次点击悬浮“导入 Obsidian”会切换关闭面板（`btn.onclick` 切换 `display`）；`关闭` 只隐藏面板。两者都不会导入。
- 已复现（共享测试页 `http://127.0.0.1:8800/`，注入按钮存在）：打开面板 → `全选` → `导入所选`，IndexedDB `documents` 由 1 变为 16（新增 15），映射 `obsidian-import-map` 含 15 项，全部显示“已导入”。**导入链路正常。**
- 结论：用户所述现象更可能是误触悬浮按钮（切换关闭）或 `关闭`，而非导入失败。仍需用户确认点击的具体按钮。
- 未解决：`?panel=3` 与根 `8800/` 界面布局看起来不同，原因未查明。
- 未做：未改代码，未重启服务。

### 11:xx 面板“已导入”但内容区无新增（用户截图 + 共享页复现）
- 用户截图：8800 左侧列表仅 3 篇（`内容1`、`01 1000人手工…`、`03 制衡篇…`）；面板 15 篇全部显示“已导入”。
- 共享页复现（`?repro=1`）：刷新前 `documents` 16 条、映射 15 条；刷新（`/?reload=…`）后 `documents` 变为 **1 条**，映射仍 15 条。
- 结论（修正）：以用户 Chrome 的两次导入+刷新测试与截图为准，面板导入的记录刷新后保留，导入功能有效。上面的共享页复现只代表共享测试 profile，不能作为“导入会丢”的结论，也不作为改方案的依据。
- 共享页观察（仅共享测试 profile）：刷新后 `documents` 由 16 条变为 1 条，映射仍 15 条。原因未查明，本轮不继续。
- 用户截图（8800 左侧仅 3 篇，面板 15 篇显示“已导入”）：与用户两次通过测试的结论存在差异，待用户复测确认，不由助手单方面判定。
- 用户截图 2–4 证实：面板把 15 篇标为“已导入”，但库中只有 4 篇。原因：状态只看映射表，导入时“已导入”被静默跳过，没有写入。这是逻辑错误，不是导入失败。
- 已按批准修改 `tools/doocs/server.js`：状态改为以 `documents` 中真实记录为准（新 / 需重导 / 已导入 / 源已更新）；写入后回读校验，通过才写映射；失败逐篇列出原因；结果提示不再被刷新覆盖。设计标准见 `docs/02-design/DOOCS_LOCAL_DEPLOYMENT.md` 的 Obsidian 章节。
- 8800 已单独重启（父 PID 11432，md-cli 子进程 41592），`/` 返回 200，服务内容含新逻辑。3000 未重启。
- 待用户复测：打开面板应显示 15 篇多为“需重导”，勾选后导入，回读通过才计入成功，再 F5 核对左侧数量。

### 11:xx 悬浮按钮“消失”的核实（只读）
- 共享页 `?repro=1`：点击 `导入 Obsidian` 后按钮仍在，MutationObserver 观察 20 秒无移除。点击只切换面板，**不会移除按钮**。
- 共享页 `1a819bab`（根 `8800/`）：**没有**悬浮按钮，`obsidian-import-map` 与面板脚本均不存在。页面加载时间为 2026-11-21 14:54，早于本次注入改动。布局也与 `?repro=1` 不同（顶栏仅 Copy/Style，无 Publish）。
- 结论：用户截图中“没有悬浮按钮”与旧页面一致，即**页面是在注入前加载的旧 HTML**，并非点击后消失。需要用户确认截图所在页面的 URL 与加载时间。

### 11:xx 8800 存储后端与写入路径（只读核对，不启动浏览器）
- 8800 根 HTML 在 `<head>` 中先加载 `/local-storage-adapter.js`。代码层面该适配器会替换 `indexedDB.open('doocs-md')`，但**这只是代码推断，已被用户页面证据否定（见下）**。
- 用户 Chrome 控制台结果（8800 页面）：`typeof window.localStorageDB` = `'object'`；`String(indexedDB.open).slice(0,60)` = `'function open() { [native code] }'`；`/api/storage/documents` 的 `count` = `0`。
- 结论（修正前一条）：用户页面的 `indexedDB.open` 是原生实现，**适配器的劫持未生效**，用户文档在浏览器真实 IndexedDB（`doocs-md` / `documents`）中。`tools/doocs/local-storage/documents` 为空，不是用户文档的存储位置。前一条“写入与回读无法完成”的推断**撤回**。
- 仍未解释：面板显示“已写入”但内容区不变化的原因。待查：Doocs 是否只在加载时读取 `documents`、是否有列表缓存。本轮只读代码，未改代码。

### 12:5x 全选与状态链路复核（只读，代码对照）
- 全选：`tools/doocs/server.js` `btnAll.onclick`（约第 199–202 行）已是切换逻辑，服务版 HTML 含 `allChecked`。用户截图“一次点击后不能释放”与旧标签页一致（旧页面加载于 PID 33104 重启之前，旧逻辑每次都全选）。需用户新查询串或强制刷新后复测。
- 状态：`computeStatuses`（约第 31 行）每次打开面板时实时读取 `documents`，`map` 命中且记录存在且 mtime 相同才为“已导入”。因此截图中 15 篇全部“已导入”说明：在面板打开的那一刻，IndexedDB `documents` 中确实存在这 15 个 docId。
- 矛盾：同一时刻左侧内容区只有 4 篇。因此问题不在面板的判断，而在 Doocs 侧边栏的数据来源（很可能是启动时加载的内存列表，写入后不刷新；或侧边栏读取的并非同一存储）。这一点尚未验证。
- 未做：未改代码；未定位服务版 chunk 中侧边栏列表的读取位置（入口 bundle 不含 IDB 代码，需要读取 chunk，待批准）。
- 13:1x 全选修复（已改代码，未重启）：`tools/doocs/server.js` 的 `btnAll.onclick` 改为显式状态 `selectAllOn` 翻转，不再从复选框推导。`node --check` 通过。面板脚本内嵌在 `server.js` 中，需重启 8800 才会生效；重启待批准。
- 13:21 已批准并重启 8800：旧 PID 33104 / 48100 已停止，新 PID 65288（服务）/ 8384（md-cli）。`/` 返回 200，服务内容含 `selectAllOn`。用户复测：全选一次全选，再点一次全取消，**通过**。
- 13:30 用户截图：点击写入后，“03 突围篇”变为已导入（回读通过，IndexedDB 中存在该记录），但左侧内容区没有该文章；其余 14 篇在启动时即为“需重导”。这说明：记录写入后、或页面加载后，记录不在侧边栏所读的位置。
- 页面来源（已验证，代码）：`tools/doocs/node_modules/@doocs/md-cli/server.js` 的 `/` 路由从远程 `https://md.doocs.org/` 取 HTML 并注入 `/local-storage-adapter.js`；其余静态资源经代理转发到远程 `md.doocs.org`。因此 8800 的编辑器代码来自远程官方站点，本地只能改注入与面板。
- 入口 bundle `md-index-BLMbB4cV.js`（远程，312369 字符）中，搜索 `objectStore("documents")`、`"documents")`、`.getAll()`、`__editor_content` 均无命中。侧边栏列表的读取代码在懒加载 chunk 中，尚未定位。
- 状态文案修改（已改代码，未重启）：只保留“已导入 / 未导入”，未导入不显示文字；去掉“需重导 / 源已更新 / 新”。已导入 = 映射存在且 `documents` 中该记录存在。`node --check` 通过。
- 未解决：侧边栏为何不显示已写入（且回读通过）的记录。启动时 14 篇显示未导入，提示记录在页面加载后未保留，或侧边栏读取的不是同一位置。待定位侧边栏读取代码后再判断。

- 12:3x 记录：8800 已按批准重启（PID 33104，md-cli 子进程另起），`GET /` 返回 200，服务内容包含新的全选切换代码。3000 未重启。用户需用新查询串（如 `?v=N`）加载页面，避免旧标签页缓存旧 HTML。
- 修复：全选按钮改为切换（第一次全选，再点全不选）。`node --check` 通过。**8800 需要重启后新代码才会生效**，未经批准未重启。
- 上述三项控制台结果已由用户提供（见本节上方），不再需要重复查询。

### 15:xx 远程 chunk 只读扫描（已批准，一轮，结束）
- 方法：拉取 `https://md.doocs.org/` 的 HTML，共 109 个 `/static/js/*.js`，逐个拉取并搜索 `doocs-md`、`"documents"`、`objectStore(`、`.getAll()`、`__editor_content`。
- 结论 1（已验证）：`md-storage-B8GIogoY.js` 定义了 IDB 常量 `doocs-md`（库名）与 `documents`（store 名，变量 `T`），并包含 `objectStore(` 的封装。这是唯一命中 IDB 的 chunk。
- 结论 2（已验证）：其余 108 个 chunk 中，没有 `objectStore(` 或 `.getAll()` 命中。侧边栏的读取很可能通过 `md-storage` 模块导出的函数完成，而不是直接访问 IDB。
- 缺口（未验证）：搜索模式使用双引号 `"documents"`，但代码中 store 名以反引号形式出现（`` `documents` ``），因此该模式会漏检。未能确认哪个导出函数被侧边栏调用。
- 下一步（待批准）：只读查看 `md-storage-B8GIogoY.js` 的导出列表，以及调用这些导出的 chunk。不做第二轮全量扫描，不改代码，不重启。

### 15:1x 补齐缺口：md-storage-B8GIogoY.js 读取链（只读，一次拉取）
- 缺口原因：上一轮搜索模式用双引号 `"documents"`，漏掉了反引号写法 `` `documents` ``。本轮改为直接读取已命中的 `md-storage` chunk，不做全量重扫。
- 已验证（代码）：`dt()` 对 store `T`（即 `documents`）执行 `getAll(T)`；`documentRepo.loadAll()` 先判断模块级变量 `K`，若 `K` 已有值则直接返回，**不再读 IDB**。`K` 只在首次调用时从 IDB 填充。
- 已验证（代码）：`lt()` 写入时 `getAllKeys(T)` 后逐条 `put`，并删除不在列表中的 key；写入也会更新 `K`，但这只发生在 Doocs 自己的写入路径中。
- 结论（已由代码与用户截图坐实）：面板写入后，侧边栏列表不刷新，刷新后可见。
  - 代码证据 1：面板 `runImport` 直接 `tx.objectStore('documents').put(record)`（`tools/doocs/server.js`），不访问页面模块内的 `K`，也不调用 `X.saveAll`。
  - 代码证据 2：`md-post` 中 `o` 的初始化只在 store 创建时读取一次（`st()` → `K`）；`md-post` 与 `md-storage` 中没有监听 `storage` 事件、`BroadcastChannel` 或 `visibilitychange` 来重新读取 IDB 更新 `o`（`visibilitychange` 只用于持久化，见 `md-post`）。
  - 现象证据：用户报告（13:30）“03 突围篇”写入后状态变为已导入，但左侧内容区未出现。“写入后 F5 可见”未被证实，前一版记录有误，已撤回。
  - 限制：本结论来自代码路径与已有截图，未在本轮重新运行时复测。
- 未验证：侧边栏是否调用 `loadAll()`。需要定位导出 `{X as a, tt as c, ...}` 中被侧边栏组件引用的那一项。
- 未验证：`q` 与 `nt()` 的含义（疑似另一种存储模式，本轮未读）。
- 下一步（待批准）：只读查找导出名 `a`、`c`、`d`、`f` 等在哪个组件中被调用（需要拉取少量 chunk）。不重启，不改代码。

### 15:2x 修正搜索（补上漏检，全部 109 个 chunk，一次）
- 模式：反引号 `` `documents` ``、`md-storage-*.js` 引用、`loadAll`、`getAll(`、`objectStore(`。
- 事实 1：`` `documents` `` 只在 `md-storage-B8GIogoY.js` 中出现（store 定义与 `createObjectStore`）。
- 事实 2：导入 `md-storage` 的 chunk 共 13 个（index、locale、oauth、auth、ui、marketplace、post、aiConfig、quickCommands、template、sync、useImageUploader、provider-registry）。这些 chunk 中没有 `loadAll` 或 `getAll(`/`objectStore(` 的直接调用。
- 事实 3：`async loadAll()` 定义在 `md-storage` 中，对象名为 `X`，导出名为 `a`。`X` 在 `md-storage` 中只有此处定义 `loadAll`。
- 事实 4：`md-post-lNrXOuSq.js` 以 `a as t` 导入 `X`，但该 chunk 中没有 `loadAll` 调用。
- 结论（已验证）：**“侧边栏调用 `loadAll()`”这一推断被否定**：在全部 109 个 chunk 中，`loadAll` 没有被 `md-storage` 之外调用。
- 未解决：侧边栏实际调用 `X` 的哪个方法未知（候选为 `X` 的其他方法，如 `savePost` 或列表读取方法）。需要读取 `X` 的完整方法列表，并在 `md-post` 中查找对应的 `t.<方法>` 调用。
- 状态：未改代码，未重启，未提交，未推送。

### 15:4x 本地文件分析（用户提供 Downloads 中两个 chunk，不再联网）
- 已验证：`X`（导出名 `a`）的方法为 `loadAll`、`savePost`、`saveAll`、`deletePost`、`clear`。
- 已验证：`md-post` 的写入路径是 `t.saveAll`（防抖 500ms，约 6 处）与 `t.savePost`（单篇）。`md-post` 中没有 `t.loadAll`，也没有对列表 `o` 的读取来源定义。
- 已验证：`X.loadAll()` 在存储初始化时被调用（`await X.loadAll()`，两处初始化分支）。因此模块缓存 `K` 在页面加载时即被填充，之后的读取走 `K`。
- 未解决：`md-post` 的列表 `o` 从哪里读取（不是 `t.loadAll`）。读取来源需要在 `md-post` 中找到 `o` 的初始化位置，或在其他导出中继续追踪。

### 15:5x 本地验证结论（只读本地文件，不联网）
- 已验证：`md-post` 的 Pinia store `post`（`var T=v(`post`,...)`）中，列表 `o = _(e?.length ? w(e) : [C()])`，其中 `e = c()`。
- 已验证：`md-post` 的 import 中 `o as c` 来自 `md-storage`；`md-storage` 中 `function st(){return K}`，即 `c()` 返回模块级缓存 `K`。
- 已验证：`X.loadAll()` 在存储初始化时调用，填充 `K`（见 15:4x 条目）。
- 链路（本地已验证）：IDB `documents` → `X.loadAll()`（初始化）→ `K` → `st()` → `post` store 的 ref `o` → 侧边栏。
- 待验证（未作为结论）：面板写入后侧边栏是否刷新。验证方法：用户在 8800 页面读取 IDB 数量与标题（N0/S0 → 写入 → N1/S1 → F5 → S2）。仅在运行时结果一致时才可写入结论。

### 16:1x–16:4x 8800 重启后的截图结果（用户提供，已记录事实）
- 重启：8800 已按批准重启，doocs 服务 PID 45496，md-cli PID 72980（端口 52269），`GET /` 返回 200；服务 HTML 含“导入 Obsidian”与“未导入”，不含“需重导”。
- 基线（用户控制台，已记录）：N0（IDB `documents` 条数）= 4（内容1、02 跨界篇、01 1000人手工、03 制衡篇）；`obsidian-import-map` 条数 = 15；侧边栏 S0 = 4（与 IDB 标题一致）。
- 写入（已记录）：面板写入“00 白坂亚纪跨界入阅事件总览”后，该文件状态变为“已导入”，回读通过（截图）。
- 写入后侧边栏（已记录）：左侧内容区仍为 4 篇，未出现新文章（截图）。
- 未确认：写入后 IDB 条数 N1 未记录，无法确认新记录已进入 `documents`。“回读通过”不等于条数已增加。
- 导入所选后全选（代码已证实）：`btnRun` → `runImport` → `loadList()` → `render()`，`render()` 对每项执行 `cb.checked = status !== '已导入'`。因此导入后未导入项被重新勾选，这是重新渲染的结果，不是 `btnAll` 被触发。

### 18:38–18:51 Plan A 测试结果（已证实，用户陈述 + 截图）
- 重启：8800 已重启，新监听 PID 31804；服务 HTML 含“正在刷新页面”。
- 用户操作：点击“导入所选”后页面立即 F5 刷新（`location.reload()`）。
- 结果：刷新后面板底部提示文字不可见，用户无法读取；IDB 条数仍为 4，标题不变（18:43、18:47–18:48 截图）。
- 结论：Plan A 的 reload 与“导入结果提示”相互冲突。测试无效，不能判定 Plan A 是否有效，也不能证明 reload 先于或后于 `lt()` 删除。
- 用户反馈：点击导入后自动刷新是错误决定，需要重新决定方案。
- 用户决定（选项 1）：撤销自动刷新，只保留面板底部结果提示，不调用 `location.reload()`。
- 已执行：`tools/doocs/server.js` 的 `btnRun.onclick` 已删除 reload 分支；`node --check` 通过；8800 已重启（新 PID 待记录），`GET /` 返回 200，HTML 不含 `location.reload`。
- 待测（用户执行）：勾选 1 篇新文章点“导入所选”，记录面板底部完整文字；立即查 IDB 条数；等几秒后再查一次。

### 18:02–18:27 删除路径定位（用户控制台 trace + Doocs 本地 chunk 代码，已证实）
- 已证实（trace）：面板 `put` 成功（`put.onsuccess`、`tx.oncomplete`）后，IDB 条数仍被回退到 4；`f83ab779`（02 政策篇）、`5d70307a`（01-第一篇）、`dfd9d1d1-838e-4147-bfe9-eef6e873e982`（00 白坂亚纪跨界入阁事件总览）均不在库中（18:10、18:18、18:26:45 只读统计）。
- 已证实（trace，18:26:03.437）：`delete documents dfd9d1d1-...` 由 `md-storage-B8GIogoY.js:1:15944` 处的 `lt()` 发起，即 Doocs 自身代码，不是面板。
- 已证实（代码，`md-storage-B8GIogoY.js` 偏移 15740–15900）：`lt(e)` 取 IDB 全部 key，把 `e` 全部 put，并 `delete` 所有不在 `e` 中的 key，然后 `K=[...e]`。
- 已证实（代码，偏移 16530–16950）：`X.saveAll(e)` 调用 `lt(e)`；`X.loadAll()` 仅在 `K` 为空时从 IDB `getAll` 填充 `K` 并缓存（之后直接返回 `K`）。`savePost` 走 `ut()`（单条 put，不删除）。
- 已证实（trace，18:26:03–18:26:29）：`lt()` 每次写回的仍是 Doocs 内存列表的 4 条（`1fc73d73`、`21c11fed`、`af686e32`、`bf44bda8`），面板写入的记录不在其中，因此被删除。
- 结论（由代码 + trace 证实）：面板直接写 IDB，绕过了 Doocs 的内存缓存 `K`；Doocs 的 `saveAll → lt` 会删除不在 `K` 中的 IDB 记录。面板写入的记录在下一次 `saveAll` 时被删。
- 未证实：触发 `saveAll` 的具体时机（定时、事件或切换文章）；`nt()` 的 pagehide 备份是否会在初始化时覆盖 IDB（需读 `nt`/`ft` 代码后再定）；`q` 标志在 8800 下是否为 false（trace 显示写入走 IDB，推断为 false，未直接读取）。
- 之前的 01-第一篇 删除（18:13–18:15）：未被 delete trace 捕获；原因未证实。
- 面板“已导入”与 IDB 不一致（00 白坂 截图 18:26，已导入但未勾选且库中无记录）仍是待修的假成功问题。
- 进程核对（18:20，只读）：8800 仅 PID 45496 监听，52269 为 PID 72980，3000 为 PID 63188；另有 11:01 启动的 node 进程（48596、17712、62076、36776）未监听 8800/3000，归属未证实。
- 状态文案（已证实）：当前代码只显示“已导入 / 未导入”。截图中的“需重导”出现在旧标签页（`?v=4`），与重启后的 HTML 不一致；旧页面缓存原因未验证，需强制刷新或新查询串复测。
- 控制台报错（已记录，影响未验证）：
  - `postMessage` 的 targetOrigin 与 3000 不匹配（`v=4:321`），来自既有 `injectedScript`，不是面板代码。
  - `unset.min.js` 404 与 googletagmanager DNS 失败，与本问题无关。
  - `[Obsidian] 从本地存储加载了 0 个文档`（`local-storage-adapter.js:44`）：与 IDB 的关系未验证，不能作为结论。
- 仍未解决（未确认）：
  1. 写入后 N1 与侧边栏 S1 未记录。
  2. 侧边栏是否在写入后读取新记录，仍依据 15:5x 的代码链路推断，未在运行时复测。
  3. `local-storage-adapter` 报告“0 个文档”与 IDB 的关系。
  4. `01/02/03` 在旧页面显示“需重导”的原因（可能是旧页面状态或 docId 不一致，未验证）。
- 文档待同步：`docs/02-design/DOOCS_LOCAL_DEPLOYMENT.md` 第 48–82 行仍描述旧版 mtime 与“源已更新/需重导”，需更新为当前两状态逻辑（待批准）。

### 17:3x 用户控制台只读检查（用户截图，已记录事实）
- 用户确认：页面运行的是最新代码（用户陈述，未由我独立验证）。
- 已证实（截图）：`obsidian-import-map` 中含“安全篇”的键有 1 条；其 docId = `63600b56-4e57-4856-885f-8df5192a8779`。
- 已证实（截图）：`doocs-md` / `documents` 总条数 = 4，标题为 内容1、02 跨界篇、01 1000人手工、03 制衡篇。
- 已证实（截图）：上述 docId 在 IDB 中不存在（`在IDB中: false`）。
- 因此：04 安全篇的映射指向一条不存在的记录，这与面板显示“已导入”的规则相矛盾（映射存在 + 记录存在才算已导入）。
- 未确认：该 docId 是从未成功落库，还是落库后被删除；映射条目的写入时间与来源未知。
- 未确认：映射中其余条目（共 15 条）的 docId 是否同样缺失于 IDB。

### 17:39 用户控制台只读读取测试（用户截图，已记录事实）
- 已证实（截图）：8800 页面请求 `http://127.0.0.1:3000/api/obsidian/list` 返回 200，共 15 个文件。
- 已证实（截图）：请求 `/api/obsidian/file?path=` 对“04 安全篇”文件返回 200，长度 4244，返回 JSON 含 `path` 与 `content` 字段。
- 结论（已证实）：8800 页面到 3000 的 Obsidian 读取链路可用。
- 未证实：悬浮面板自身的导入函数是否执行过该请求；写入 IDB 失败的位置仍未定位。
