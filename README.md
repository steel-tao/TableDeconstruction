# 微信公众号智能化内容管理系统

![项目状态](https://img.shields.io/badge/status-Planning-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

一套完整的微信公众号内容创作、排版、管理和发布的工作流自动化系统。

## 🎯 快速了解

**核心功能链路：**
```
Obsidian (撰写) → Doocs (排版) → 自动化管理 → 微信发布 → 数据分析
```

**主要特性：**
- ✨ 本地化内容管理（Obsidian Vault）
- 📐 自动排版处理（Doocs集成）
- 🤖 工作流自动化（文件监听、一键发布）
- 📊 发布记录与统计
- ⏰ 定时发布支持
- 🔄 内容版本控制与回滚

## 📦 项目结构

```
weixin-content-management/
├── docs/                          # 📚 项目文档
│   ├── 01-requirements/          # 需求文档
│   ├── 02-design/                # 设计文档
│   ├── 03-api/                   # API文档
│   ├── 04-user-guide/            # 用户指南
│   └── 05-deployment/            # 部署文档
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
├── PROJECT_PLAN.md              # 项目规划书
├── IMPLEMENTATION_GUIDE.md      # 实施指南（待编写）
└── CHANGELOG.md
```

## 🚀 快速开始

## 🏠 本地运行策略

本项目采用本地优先策略：
- Obsidian：本地 Vault 存储与管理文案
- Doocs：优先私有化本地部署（`@doocs/md-cli` 或 Docker）
- WeChat：优先 API 草稿/发布，若受平台限制可走 copy/paste 兜底

这意味着我们以 90% 自动化为目标，保留最后一步人工发布作为可接受路径。

### 环境要求
- Node.js >= 16.0
- npm >= 7.0 或 pnpm >= 6.0
- Obsidian >= 1.0 (可选)

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 运行测试
```bash
npm test
```

## 📚 文档导航

- [项目规划书](PROJECT_PLAN.md) - 整体规划与需求分析
- [实施指南](IMPLEMENTATION_GUIDE.md) - 详细实施步骤（开发中）
- [Doocs 本地部署记录](docs/02-design/DOOCS_LOCAL_DEPLOYMENT.md) - 本地部署与主题验证
- [API文档](docs/03-api/README.md) - 接口文档
- [用户指南](docs/04-user-guide/README.md) - 操作手册

## 🔄 开发流程

```
需求定义 (用户) 
    ↓
需求确认 (双方)
    ↓
详细设计 (开发)
    ↓
代码实现 (开发)
    ↓
测试验证 (开发 + 用户验收)
    ↓
上线部署 (开发)
```

## 📋 核心模块

### 1. 内容处理引擎 (Core)
- Markdown文件解析与AST生成
- 前置元数据提取（YAML Frontmatter）
- 内容校验与清理

### 2. Doocs排版集成 (Renderer)
- HTML生成
- CSS主题应用
- 响应式输出优化

### 3. 发布管理 (Publish)
- 微信API集成（草稿、定时发布）
- 发布流程审核
- 发布记录存储

### 4. 文件监听系统 (File System)
- Obsidian Vault监听
- 增量更新检测
- 自动触发处理流程

### 5. 数据分析 (Analytics)
- 发布统计
- 内容性能分析
- 用户反馈跟踪

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **运行时** | Node.js | ^16.0 |
| **语言** | TypeScript | ^4.9 |
| **包管理** | npm/pnpm | latest |
| **排版引擎** | Doocs (集成) | - |
| **数据库** | SQLite | 3.x |
| **测试** | Jest | ^29.0 |
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

**项目状态**: 架构设计阶段 → 正在规划详细实施方案

**最后更新**: 2024年9月23日
