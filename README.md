# 微信公众号智能化内容管理系统

![项目状态](https://img.shields.io/badge/status-development-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

一套完整的微信公众号内容创作、排版、管理和发布的工作流自动化系统。

## 🎯 快速了解

**当前状态**：Obsidian → 8800 编辑器 → 微信草稿箱的主流程可用（3000 选文填充、8800 顶层发布）；3000 内嵌发布未实现。详见 [CURRENT_STATUS.md](CURRENT_STATUS.md)。

```
用户操作界面
├── 文件管理器 (3000) → 选 Obsidian 文章，填充内嵌 Doocs 编辑器
├── Doocs 编辑器 (8800) → 悬浮面板复制正文；顶层编辑后发布到草稿箱
           ↓
      API 服务器 (3001)
           ↓
      WeChat API
```

## 📦 项目结构

以下目录图是初版规划示意，不是当前仓库清单；实际文件以当前仓库为准。

```
weixin-content-management/
├── docs/                          # 📚 项目文档
│   ├── 02-design/                # 设计文档
│   ├── 03-api/                   # API文档
│   ├── 03-reports/               # 报告与交接文档
│   └── 04-user-guide/            # 用户指南
├── src/                           # 💻 源代码
│   ├── core/                     # 核心业务逻辑
│   │   ├── parser/              # Markdown解析器
│   │   ├── renderer/            # Doocs渲染引擎
│   │   └── validator/           # 内容验证
│   ├── services/                # 服务层
│   │   ├── wechat/              # 微信API集成
│   │   ├── file-system/         # 文件系统操作
│   │   ├── publish/             # 发布流程管理
│   │   └── analytics/           # 数据分析
│   ├── models/                  # 数据模型和Schema
│   ├── utils/                   # 通用工具函数
│   ├── config/                  # 配置模块
│   ├── db/                      # 数据库操作层
│   ├── cli/                     # CLI命令接口
│   └── types/                   # TypeScript类型定义
├── tests/                         # ✅ 测试文件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── fixtures/                # 测试数据
├── obsidian-vault/              # 📝 Obsidian示例库
│   ├── templates/               # 文档模板
│   ├── content/                 # 内容文件夹
│   ├── attachments/             # 附件存储
│   └── .obsidian/              # Obsidian配置
├── resources/                     # 📦 资源文件
│   ├── css/                     # 排版CSS主题
│   ├── schemas/                 # 元数据Schema定义
│   └── examples/                # 使用示例
├── scripts/                       # 🔧 工具脚本
│   ├── setup.js                 # 初始化脚本
│   ├── dev-server.js            # 开发服务器
│   └── deploy.js                # 部署脚本
├── .github/                      # GitHub配置
│   └── workflows/               # CI/CD流程
├── config/                       # ⚙️ 配置文件示例
│   ├── wechat-config.example.json
│   ├── obsidian-config.example.json
│   └── publish-rules.example.json
├── .gitignore
├── .eslintrc.js
├── .prettierrc.js
├── package.json
├── tsconfig.json
├── jest.config.js
└── CHANGELOG.md                 # 若存在
```

## 🚀 快速开始

### 一键启动系统

```powershell
cd F:\TableDeconstruction
.\start.ps1
```

**预期输出**：
```
Building...
> weixin-content-management@0.1.0 build
> tsc

Starting API server on port 3001...
Starting file manager on port 3000...
System started successfully!
API: http://localhost:3001
Files: http://localhost:3000
```

### 访问系统

| 组件 | 地址 | 功能 |
|------|------|------|
| **控制面板** | `CONTROL_PANEL.html` | 创建、审核、发布记录 |
| **API 服务** | http://localhost:3001 | REST API |
| **文件管理器** | http://localhost:3000 | Obsidian 选文、填充 Doocs 编辑器 |
| **Doocs 编辑器** | http://127.0.0.1:8800 | 排版、悬浮面板复制、顶层发布（由 `start.ps1` 启动） |

**Doocs 与发布的现状**：8800 顶层发布可用；3000 内嵌发布未实现。详见 [CURRENT_STATUS.md](CURRENT_STATUS.md) §3、§5。

### 完整业务流程验证

1. **创建记录** - 在控制面板输入标题和内容
2. **提交审核** - 点击"提交审核"按钮
3. **批准发布** - 点击"批准"按钮
4. **执行发布** - 点击"发布"按钮，自动发送到 WeChat
5. **查看结果** - 验证 WeChat 消息 ID 是否返回

### 环境要求
- Node.js >= v24.14.1
- npm >= 11.0
- PowerShell 5.0+ (Windows)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run build      # 编译 TypeScript
npm run start:server     # 启动 API 服务器
npm run start:file-manager   # 启动文件管理器
```

### 验证系统

```powershell
.\verify.ps1
```

### 停止系统

启动脚本会打印各服务 PID，按 PID 停止：

```powershell
Stop-Process -Id <PID> -Force
```

### 运行测试

```bash
npm test
```

## 📚 核心文档

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 文档分类与维护规范 |
| [CURRENT_STATUS.md](CURRENT_STATUS.md) | 项目现状的唯一记录（能力、业务流程、端口、Doocs 事实、阻塞） |
| [docs/03-reports/DOOCS_WECHAT_HANDOFF.md](docs/03-reports/DOOCS_WECHAT_HANDOFF.md) | 窗口切换交接：待决策事项与下一步 |
| [SYSTEM_GUIDE.md](SYSTEM_GUIDE.md) | 系统指南和 API 文档（未验证，见文件顶部标注） |

## 🏗️ 系统架构

```
用户操作层
├── CONTROL_PANEL.html (控制面板)
├── 文件管理器 (http://localhost:3000)
└── Doocs 编辑器 (http://127.0.0.1:8800)
         ↓
    API 服务器 (3001)
    ├── Express.js 框架
    ├── TypeScript 编译
    └── CORS 配置
         ↓
    数据访问层
    ├── SQLite 数据库
    ├── 发布记录表
    ├── 审计日志表
    └── 配置表
         ↓
    WeChat 集成
    ├── Token 获取
    ├── 草稿保存
    ├── 文章发布
    └── 历史管理
```

## ✅ 功能完成状态

| 阶段 | 功能 | 状态 | 验证 |
|------|------|------|------|
| **P1** | WeChat Token 获取 | ✅ 完成 | ✅ 已验证 |
| **P2** | 发布记录管理 | ✅ 完成 | ✅ 已验证 |
| **P3** | 内容渲染 | ✅ 完成 | ✅ 已验证 |
| **P4** | 内容验证 | ✅ 完成 | ✅ 已验证 |
| **P5** | 自动发布 | ✅ 完成 | ✅ 已验证 |
| **集成** | 完整业务流程 | ✅ 完成 | ✅ 已验证 |
| **部署** | 一键启动脚本 | ✅ 完成 | ✅ 已验证 |
| **文档** | 完整文档 | ✅ 完成 | ✅ 已验证 |

## 🔄 开发流程

```
用户验证业务流程 → 修复问题 → 生产部署 → 监控维护
```

## 📋 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | v24.14.1 | 运行时 |
| **TypeScript** | 最新 | 类型安全 |
| **Express.js** | ^4.18.2 | Web 框架 |
| **SQLite** | 3 | 数据库 |
| **Marked** | ^9.1.0 | Markdown 渲染 |
| **Chokidar** | ^3.5.3 | 文件监听 |
| **Axios** | 最新 | HTTP 客户端 |

### 4. 文件监听系统 (File System)
- `src/services/file-system` 中的 `VaultWatcher` 尚未实现；现有文件管理器是独立的文件浏览/编辑服务。

### 5. 数据分析 (Analytics)
- `src/services/analytics` 当前仍为未实现占位模块。

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **运行时** | Node.js | `package.json` 声明 >=16 |
| **语言** | TypeScript | ^5.1.6 |
| **包管理** | npm/pnpm | latest |
| **HTTP 服务** | Express | ^4.18.2 |
| **数据库** | better-sqlite3 | ^12.11.1 |
| **测试运行器** | Jest | ^29.6.2 |
| **Lint** | ESLint + Prettier | latest |

## 📝 配置文件

项目使用以下配置文件（示例在 `config/` 目录）：

- `wechat-config.json` - 微信账号与API配置
- `obsidian-config.json` - Obsidian Vault路径与规则
- `publish-rules.json` - 发布策略与审核流程
- `.env.local` - 本地环境变量（安全信息）

## 🤝 贡献与反馈

本项目由核心开发团队驱动。如有反馈，请通过以下方式提出：
- 提交Issue
- Pull Request
- 直接沟通

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**项目状态（2026-11-18核对）**: 本地数据库发布 API 与 Mock 微信的基本流程已贯通；独立进程启动 smoke test、真实微信 API 和 TypeScript renderer/validator 尚未验收或完成。

**原始 README 日期**: 2024年9月23日
