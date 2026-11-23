# 微信 API 适配器配置（API 级）

**状态**：未验证真实微信调用。本文件只描述代码与脚本的配置方式。
**注意**：当前 8800 发布路径通过浏览器扩展（COSE）完成，不经过本文件描述的 API 适配器。现状见 [CURRENT_STATUS.md](../../CURRENT_STATUS.md) §3 C 与 §5。

## 适配器选择

由环境变量 `WECHAT_ADAPTER` 决定，默认 `mock`（`src/services/wechat/adapter.ts`，`src/server.ts`）。

| 值 | 行为 |
|---|---|
| `mock` | 不访问微信，返回模拟的 token 与 msgId。默认值。 |
| `real` | 调用微信公众号 API。必须同时设置 `WECHAT_APP_ID` 与 `WECHAT_APP_SECRET`，否则启动报错（`src/server.ts`）。 |

凭证只写在本地 `.env` 中，参考 `.env.example`。不要提交 `.env`。

## 可用脚本

| 命令 | 用途 | 状态 |
|---|---|---|
| `npm run demo:publish` | 运行 `scripts/demo-publish-workflow.cjs`，mock 演示创建、审核、发布流程 | 仅 mock，见该脚本头部说明 |
| `npm run test:wechat-api` | 运行 `scripts/test-wechat-api.cjs`，依次检查配置、Token、草稿、发布 | 未在本次复核 |
| `npm run test:publish-flow` | 运行 `src/services/publish/index.test.ts` | 未在本次复核 |

## 权限

发布权限、草稿权限与审核要求以微信公众平台官方文档为准。本项目未在真实账号上确认这些权限。
