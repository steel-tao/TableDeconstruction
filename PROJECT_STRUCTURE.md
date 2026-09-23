# 项目结构总览 (PROJECT STRUCTURE)

## 完整目录树

```
weixin-content-management/
│
├── 📄 README.md                    # 项目首页
├── 📄 PROJECT_PLAN.md              # 项目规划书
├── 📄 IMPLEMENTATION_GUIDE.md       # 实施指南
├── 📄 CHANGELOG.md                 # 变更日志
├── 📄 LICENSE                      # MIT许可证
│
├── 📁 docs/                        # 📚 项目文档 (5个子目录)
│   ├── 01-requirements/            # 需求文档
│   │   └── README.md
│   ├── 02-design/                  # 设计文档
│   │   └── README.md
│   ├── 03-api/                     # API文档
│   │   └── README.md
│   ├── 04-user-guide/              # 用户指南
│   │   └── README.md
│   └── 05-deployment/              # 部署文档
│       └── README.md
│
├── 📁 src/                         # 💻 源代码
│   ├── index.ts                    # 应用入口
│   │
│   ├── core/                       # 核心业务逻辑
│   │   ├── parser/
│   │   │   └── index.ts            # Markdown解析器
│   │   ├── renderer/
│   │   │   └── index.ts            # Doocs渲染引擎
│   │   └── validator/
│   │       └── index.ts            # 内容验证器
│   │
│   ├── services/                   # 服务层
│   │   ├── wechat/
│   │   │   └── index.ts            # 微信API集成
│   │   ├── file-system/
│   │   │   └── index.ts            # 文件系统与Vault监听
│   │   ├── publish/
│   │   │   └── index.ts            # 发布流程管理
│   │   └── analytics/
│   │       └── index.ts            # 数据分析
│   │
│   ├── models/                     # 数据模型
│   │   └── index.ts                # 数据结构定义
│   │
│   ├── config/                     # 配置模块
│   │   └── index.ts                # 环境配置管理
│   │
│   ├── db/                         # 数据库操作层
│   │   └── init.ts                 # 数据库初始化
│   │
│   ├── utils/                      # 通用工具函数
│   │   └── index.ts                # 工具函数库
│   │
│   ├── types/                      # TypeScript类型定义
│   │   └── index.ts                # 全局类型定义
│   │
│   └── cli/                        # CLI命令接口
│       └── index.ts                # 命令行工具入口
│
├── 📁 tests/                       # ✅ 测试文件
│   ├── unit/                       # 单元测试
│   │   └── parser.test.ts          # 解析器测试示例
│   ├── integration/                # 集成测试
│   └── fixtures/                   # 测试数据
│
├── 📁 obsidian-vault/              # 📝 Obsidian示例库
│   ├── templates/                  # 文档模板
│   ├── content/                    # 内容文件夹
│   ├── attachments/                # 附件存储
│   └── .obsidian/                  # Obsidian配置
│
├── 📁 resources/                   # 📦 资源文件
│   ├── css/                        # 排版CSS主题
│   ├── schemas/                    # 元数据Schema定义
│   └── examples/                   # 使用示例
│
├── 📁 scripts/                     # 🔧 工具脚本
│   ├── setup.js                    # 项目初始化脚本
│   ├── dev-server.js               # 开发服务器 (待实现)
│   └── deploy.js                   # 部署脚本 (待实现)
│
├── 📁 config/                      # ⚙️ 配置文件示例 (待创建)
│   ├── wechat-config.example.json
│   ├── obsidian-config.example.json
│   └── publish-rules.example.json
│
├── 📁 .github/                     # GitHub配置 (待创建)
│   └── workflows/                  # CI/CD流程
│
├── 📁 data/                        # 数据存储 (运行时创建)
├── 📁 logs/                        # 日志文件 (运行时创建)
├── 📁 output/                      # 输出文件 (运行时创建)
│
├── 📄 .env.example                 # 环境变量示例
├── 📄 .env.local                   # 本地环境变量 (本地创建，不提交)
├── 📄 .gitignore                   # Git忽略规则
├── 📄 .eslintrc.js                 # ESLint配置
├── 📄 .prettierrc.js               # Prettier配置
│
├── 📄 package.json                 # 项目依赖与脚本
├── 📄 tsconfig.json                # TypeScript配置
├── 📄 jest.config.js               # Jest测试配置
│
└── 📄 node_modules/                # 依赖包 (npm install生成)
```

## 目录说明

### 📁 顶级目录

| 目录 | 说明 |
|------|------|
| `docs/` | 项目文档，分为5个类别 |
| `src/` | 源代码，分为7个模块 |
| `tests/` | 测试文件 |
| `obsidian-vault/` | Obsidian使用示例 |
| `resources/` | CSS主题、Schema定义等资源 |
| `scripts/` | 项目自动化脚本 |
| `config/` | 配置文件示例 |
| `data/` | 运行时数据存储 (SQLite数据库) |
| `logs/` | 运行日志 |
| `output/` | 处理后的输出文件 |

### 📁 核心模块结构 (src/)

#### core/ - 核心业务逻辑
- `parser/` - Markdown文件解析与元数据提取
- `renderer/` - Doocs排版与HTML渲染
- `validator/` - 内容验证与规范化

#### services/ - 服务层
- `wechat/` - 微信公众平台API集成
- `file-system/` - 文件系统操作与Vault监听
- `publish/` - 发布流程管理
- `analytics/` - 数据分析与报告

#### 其他模块
- `models/` - 数据结构定义
- `config/` - 配置管理
- `db/` - 数据库初始化
- `utils/` - 工具函数
- `types/` - TypeScript类型
- `cli/` - 命令行工具

### 📚 文档结构 (docs/)

| 文件夹 | 内容 |
|--------|------|
| `01-requirements/` | 需求规格、用例、用户故事 |
| `02-design/` | 架构设计、模块设计、数据库设计 |
| `03-api/` | REST API、CLI命令、事件接口 |
| `04-user-guide/` | 快速开始、配置指南、操作手册 |
| `05-deployment/` | 安装部署、配置说明、监控维护 |

## 文件类型说明

| 后缀 | 含义 |
|------|------|
| `.ts` | TypeScript源文件 |
| `.js` | JavaScript脚本文件 |
| `.json` | JSON配置文件 |
| `.md` | Markdown文档 |
| `.db` | SQLite数据库文件 |

## 配置文件说明

### 根目录配置
- `.env.example` - 环境变量示例（包含所有配置项说明）
- `.env.local` - 本地环境变量（不提交，基于.env.example创建）
- `.eslintrc.js` - ESLint代码检查规则
- `.prettierrc.js` - Prettier代码格式化配置
- `.gitignore` - Git忽略规则

### 项目配置
- `package.json` - npm项目元数据和依赖声明
- `tsconfig.json` - TypeScript编译配置
- `jest.config.js` - Jest测试框架配置

## npm 脚本

```bash
# 开发
npm run dev              # 启动开发模式 (watch)
npm run dev:watch       # 启动文件监听

# 构建与测试
npm run build           # 构建TypeScript为JavaScript
npm test                # 运行所有测试
npm run test:watch      # 开发模式下运行测试
npm run test:coverage   # 生成测试覆盖率报告

# 代码质量
npm run lint            # 运行ESLint检查
npm run lint:fix        # 自动修复ESLint错误
npm run format          # 使用Prettier格式化代码
npm run type-check      # 进行TypeScript类型检查

# 项目管理
npm run setup           # 项目初始化（创建目录、配置文件等）
npm start               # 启动生产版本
npm run prepare         # prepare钩子（发布前运行）
```

## 初始化步骤

```bash
# 1. 安装依赖
npm install

# 2. 初始化项目
npm run setup

# 3. 配置环境变量
# 编辑 .env.local，填入你的微信账号信息

# 4. 启动开发服务
npm run dev
```

## 关键路径

### 开发流程
```
修改代码 → npm run lint:fix → npm run type-check → npm test → npm run build
```

### 发布流程
```
Obsidian编辑 → Vault监听器 → 解析器 → 验证器 → 渲染器 → 审核流程 → 微信发布
```

### 配置流程
```
.env.example → .env.local → Config模块 → 各服务
```

## 下一步

1. **依赖安装**: `npm install`
2. **项目初始化**: `npm run setup`
3. **配置环境**: 编辑 `.env.local`
4. **开始开发**: 查看各模块的 `index.ts` 开始实现

## 相关文档

- [项目规划书](PROJECT_PLAN.md) - 整体规划
- [实施指南](IMPLEMENTATION_GUIDE.md) - 详细的实施步骤
- [API文档](docs/03-api/README.md) - 接口规范
- [用户指南](docs/04-user-guide/README.md) - 操作手册

---

**最后更新**: 2024年9月23日
**维护者**: 开发团队
