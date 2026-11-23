# API 文档

本文件描述当前 TypeScript 发布 API 的已实现路由。它不是完整的 REST 规范；以实际 server 实现为准。

## 运行条件

- 基础 URL：`http://127.0.0.1:<PORT>/api/publish`
- 默认端口：`3000`。文件管理器也默认使用 `3000`，并行运行时应给 API 单独指定端口，例如 `PORT=3001`。
- 微信适配器默认为 Mock；真实模式由 `WECHAT_ADAPTER=real` 启用。
- **认证：未实现。** 仅可本机回环访问；不要暴露到局域网或公网。

## 当前路由

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/records` | 创建草稿 |
| `GET` | `/records` | 分页列出记录，可选 `status`、`limit`、`offset` |
| `GET` | `/records/:id` | 查询单条记录 |
| `PUT` | `/records/:id` | 更新标题、正文或创建者 |
| `DELETE` | `/records/:id` | 删除记录 |
| `POST` | `/records/:id/submit-review` | 提交审核 |
| `POST` | `/records/:id/approve` | 审核通过 |
| `POST` | `/records/:id/reject` | 拒绝并退回草稿 |
| `POST` | `/records/:id/publish` | 发布或定时发布 |
| `GET` | `/records/:id/audit-logs` | 查询审计日志 |
| `GET` | `/stats` | 按状态统计记录 |
| `GET` | `/health` | 发布服务健康状态 |

服务器级健康检查另位于 `GET /health`（不带 `/api/publish` 前缀）。

## 流程验收边界

当前集成流程已验证创建、送审、批准、Mock 发布、审计日志和数据库重新初始化后的记录读取。该检查不是操作系统级进程重启，也不验证真实微信网络调用。API 请求与响应细节可直接查阅 `src/routes/publish.ts`；服务端口与启动方式见 [CURRENT_STATUS.md](../../CURRENT_STATUS.md) §2。

