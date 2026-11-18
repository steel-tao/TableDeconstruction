# Doocs 代码分析与优化建议

## 执行摘要

Doocs (@doocs/md-cli@2.1.3) 是一款专为微信公众号排版设计的 Markdown 编辑工具。本分析从**代码架构**、**菜单业务逻辑**和**与微信发布工作流的集成**三个维度提出具体优化建议。

---

## 第一部分：Doocs 代码架构分析

### 1.1 项目结构

```
@doocs/md-cli/
├── index.js              # 入口文件 (CLI 启动)
├── server.js             # Express 服务器配置
├── util.js               # 工具函数
├── package.json          # 依赖配置
├── dist/                 # 编译的前端资源
│   ├── index.html        # 主页面
│   ├── static/
│   │   ├── js/          # Vue + 编辑器逻辑 (minified)
│   │   ├── css/         # 样式
│   └── assets/          # 静态资源
│   └── mpmd/            # 微信排版相关模块
└── public/
    └── upload/          # 文件上传目录
```

### 1.2 核心工作流程

```
用户访问 http://127.0.0.1:55885
    ↓
Express 代理服务器 (端口 8800)
    ↓
前端 Vue 应用加载 (dist/index.html)
    ↓
用户编辑 Markdown
    ↓
实时渲染为微信格式 HTML
    ↓
用户复制 HTML (或通过 API 发送)
```

### 1.3 关键发现

#### A. 架构设计：**代理 + 前端分离**
- **后端**: Node.js Express 服务器
  - 主要职责：HTTP 代理、文件上传
  - 代理目标：https://md.doocs.org/（官方在线版本）
  - 支持云存储（uniCloud）或本地存储

- **前端**: Vue 单页应用
  - 编辑器核心逻辑在前端实现
  - 菜单系统（File, Edit, Format, Insert, Style, Help）
  - 实时预览与排版引擎

#### B. 代码特点

```javascript
// server.js 中的核心代理逻辑
app.use(createProxyMiddleware({
  target: 'https://md.doocs.org/',
  changeOrigin: true,
  // 代理所有请求到官方网站
}))
```

**问题**: Doocs 的功能完全依赖官方网站的前端代码。本地 CLI 只是一个**薄代理层**。

#### C. 文件管理

- 通过 `/upload` 接口上传文件
- 支持本地存储或 uniCloud 云存储
- 但**内容持久化完全依赖用户手动操作**（没有自动保存）

---

## 第二部分：菜单业务逻辑详解

### 2.1 菜单结构

根据代码和前端界面分析，Doocs 的菜单系统包含：

```
┌─ File (文件)
│  ├─ New
│  ├─ Open
│  ├─ Import
│  ├─ Export
│  ├─ Download
│  └─ Settings
│
├─ Edit (编辑)
│  ├─ Undo
│  ├─ Redo
│  ├─ Find & Replace
│  ├─ Insert Table
│  └─ ...
│
├─ Format (格式)
│  ├─ Bold
│  ├─ Italic
│  ├─ Code
│  ├─ Link
│  ├─ Quote
│  └─ ...
│
├─ Insert (插入)
│  ├─ Table
│  ├─ Image
│  ├─ Formula
│  ├─ Code Block
│  ├─ [TOC]
│  └─ ...
│
├─ Style (样式) ⭐ 核心功能
│  ├─ Theme (Classic, Grace, Simple, ...)
│  ├─ Font (Sans, Serif, Mono)
│  ├─ Size (14px-18px)
│  ├─ Line Height (1.5-2.05)
│  ├─ Block Spacing
│  ├─ Colors (Blue, Emerald, Orange, ...)
│  ├─ Heading Styles
│  ├─ Code Theme (github-dark, ...)
│  ├─ Caption Style
│  ├─ Mac Style (开关)
│  ├─ Line Numbers (开关)
│  ├─ Link → Footnote (开关)
│  ├─ Indent (开关)
│  ├─ Justify (开关)
│  ├─ Word Count (开关)
│  └─ Reset
│
└─ Help (帮助)
   ├─ Documentation
   ├─ Shortcuts
   └─ About
```

### 2.2 菜单业务逻辑分析

#### 关键流程 1: 样式管理

```javascript
// 概念伪代码
class StyleManager {
  constructor() {
    this.styles = {
      theme: 'classic',
      font: 'sans',
      size: '16px',
      lineHeight: 1.75,
      colors: { /* 20+ 种颜色 */ },
      codeTheme: 'github-dark'
      // ... 10+ 个样式属性
    };
  }

  applyStyle(property, value) {
    // 实时更新预览
    this.updatePreview();
    // 保存到 localStorage
    this.saveToLocalStorage();
  }

  reset() {
    // 恢复默认样式
  }
}
```

**现状**: 
- 样式保存在浏览器 localStorage 中
- 每个用户的样式配置是本地隔离的
- 无法导出/导入样式预设

#### 关键流程 2: 内容导入/导出

```
User Action: Import
  ↓
File Dialog → Select Markdown File
  ↓
Content Read → Inserted into Editor
  ↓
Rendered as WeChat Format
```

**现状**:
- 支持导入多种格式（Word, HTML, Markdown, 纯文本等）
- 导出为 HTML（可复制粘贴到微信）
- **缺失**: 直接导出为 Markdown / 保存编辑历史

---

## 第三部分：与微信发布工作流的集成分析

### 3.1 当前工作流

```
Obsidian Vault (内容 + 元数据)
    ↓ (复制 Markdown)
Doocs 编辑器 (排版)
    ↓ (复制 HTML)
微信公众号后台 (发布)
    ↓
WeChat (已发布)
```

**问题**:
1. 手动复制粘贴，容易出错
2. 无法追踪内容状态（草稿、编辑中、已发布）
3. 修改后无法更新已发布的文章

### 3.2 Doocs 在工作流中的角色局限

| 环节 | Doocs 能力 | 缺失 |
|------|----------|------|
| 内容编辑 | ✅ 实时排版预览 | ❌ 与 Obsidian Vault 同步 |
| 元数据管理 | ❌ 无元数据编辑 | ❌ 不识别 YAML Frontmatter |
| 状态追踪 | ❌ 无状态管理 | ❌ 不知道文件是否已发布 |
| 发布集成 | ❌ 手动复制 | ❌ 无 WeChat API 集成 |
| 版本控制 | ❌ 无版本历史 | ❌ 无回滚机制 |

---

## 第四部分：优化建议

### 🎯 优化目标

基于用户需求和 Doocs 当前架构，提出 **分层渐进式优化方案**：

### **第 0 层：Doocs 本身的增强** (低难度，高价值)

#### 建议 1: 集成 Frontmatter 编辑器

**目的**: 让 Doocs 识别和编辑 YAML 元数据

**实现**:
```javascript
// 在 Doocs 菜单中添加
File Menu
  ├─ New
  ├─ Open
  ├─ ... 
  └─ ✨ Metadata Editor (新增)
       └─ 显示/编辑:
          - title
          - author
          - tags
          - category
          - published
          - weixin_media_id
          - weixin_url
```

**效果**:
- Doocs 打开文件时自动提取 Frontmatter
- 用户可在编辑器中直接修改元数据
- 保存时自动更新文件的 Frontmatter

**代码框架**:
```typescript
// 新增: src/modules/frontmatter-editor.ts
class FrontmatterEditor {
  constructor(private markdownContent: string) {
    this.frontmatter = this.extractFrontmatter();
    this.body = this.extractBody();
  }

  extractFrontmatter(): Record<string, any> {
    // 使用 gray-matter 库解析 YAML
    const matter = require('gray-matter');
    const { data } = matter(this.markdownContent);
    return data;
  }

  saveFrontmatter(updated: Record<string, any>): string {
    // 重新生成带 Frontmatter 的 Markdown
    const matter = require('gray-matter');
    return matter.stringify(this.body, updated);
  }
}
```

---

#### 建议 2: 集成 Content Manager 的内容表

**目的**: Doocs 能看到本地已有的所有文章及其发布状态

**实现**:
```
File Menu
  ├─ New
  ├─ Open
  ├─ ✨ Recent Files / File Browser (新增)
  │   └─ 列表展示:
  │       - 文件名
  │       - 修改时间
  │       - 发布状态 (Draft/Published)
  │       - 最后发布时间
  └─ ...
```

**效果**:
- 用户无需手动找文件，直接从 Doocs 打开
- 一眼看到文件状态
- 可快速切换编辑不同的文件

**代码框架**:
```typescript
// 新增: src/modules/file-browser.ts
class FileBrowser {
  constructor(private vaultPath: string) {}

  async listFiles(): Promise<FileInfo[]> {
    // 扫描 obsidian-vault/articles/
    // 对每个 .md 文件:
    // 1. 解析 Frontmatter
    // 2. 读取 published 状态
    // 3. 返回列表
  }

  async openFile(path: string): Promise<string> {
    // 在编辑器中打开文件
  }
}
```

---

#### 建议 3: 样式预设导入/导出

**目的**: 创建可复用的排版样式模板

**实现**:
```
Style Menu
  ├─ Theme: Classic ▼
  ├─ Font: Sans ▼
  ├─ ... (现有项)
  ├─ ─────────────────
  └─ ✨ Manage Presets (新增)
      ├─ Save Current as Preset
      ├─ Load Preset
      ├─ Delete Preset
      └─ Export All Presets
```

**效果**:
- 创建 "微信公众号标准版式" 预设
- 创建 "学术文章版式" 预设
- 团队内共享样式模板

**代码框架**:
```typescript
// 新增: src/modules/style-preset.ts
class StylePresetManager {
  presets: Map<string, StyleConfig> = new Map();

  savePreset(name: string, config: StyleConfig): void {
    this.presets.set(name, config);
    // 保存到 localStorage 或文件系统
  }

  loadPreset(name: string): StyleConfig {
    return this.presets.get(name);
  }

  exportPresetsAsJSON(): string {
    return JSON.stringify(Array.from(this.presets.entries()));
  }

  importPresetsFromJSON(json: string): void {
    const data = JSON.parse(json);
    data.forEach(([name, config]) => {
      this.presets.set(name, config);
    });
  }
}
```

---

### **第 1 层：在 tools/ 中创建中间件** (中等难度，高价值)

#### 建议 4: 创建 Obsidian-to-Doocs Bridge

**目的**: 在你的项目中创建一个中间层，连接 Obsidian Vault 和 Doocs

**实现**:
```
tools/
├── doocs/              (已有)
└── ✨ obsidian-bridge/
    ├── server.js       # Express 服务器
    ├── services/
    │   ├── file-service.ts       # 读取 Obsidian 文件
    │   ├── metadata-service.ts   # 管理元数据
    │   ├── sync-service.ts       # 双向同步
    │   └── publish-service.ts    # 发布状态跟踪
    ├── routes/
    │   ├── files.ts
    │   ├── metadata.ts
    │   └── publish.ts
    └── package.json
```

**API 端点**:
```
GET  /api/files              # 获取所有文章列表
GET  /api/files/:id          # 获取文章内容
POST /api/files/:id          # 保存文章
GET  /api/files/:id/metadata # 获取元数据
POST /api/files/:id/metadata # 更新元数据
GET  /api/publish-status     # 获取发布状态
```

**效果**:
- Doocs 通过 Bridge 获取本地文件
- 编辑完成后自动保存回 Obsidian Vault
- 发布状态实时同步

---

#### 建议 5: 发布状态追踪系统

**目的**: 在 Bridge 层实现发布状态管理

**实现**:
```typescript
// tools/obsidian-bridge/services/publish-service.ts
interface PublishStatus {
  fileId: string;
  status: 'draft' | 'editing' | 'ready' | 'published';
  lastModified: Date;
  publishedAt?: Date;
  weixin_media_id?: string;
  weixin_url?: string;
}

class PublishStatusManager {
  async updateStatus(fileId: string, status: PublishStatus): Promise<void> {
    // 1. 更新 Obsidian 文件的 Frontmatter
    // 2. 维护发布历史
    // 3. 触发 webhook（可选，用于 CI/CD）
  }

  async getPublishHistory(fileId: string): Promise<PublishStatus[]> {
    // 获取发布历史
  }
}
```

**状态流转**:
```
draft (草稿)
  ↓
editing (编辑中)
  ↓
ready (待发布)
  ↓
published (已发布)
  ↓
archived (已归档)
```

---

### **第 2 层：WeChat API 集成** (高难度，最高价值)

#### 建议 6: WeChat Draft Manager

**目的**: 直接从 Doocs 推送草稿到微信后台

**前提**:
- 需要微信官方账号的 API 权限
- 或使用自动化工具（Puppeteer）模拟浏览器操作

**实现**:
```typescript
// tools/wechat-integration/services/draft-service.ts
class WeChatDraftManager {
  async createDraft(
    title: string,
    content: string,          // 微信 HTML 格式
    metadata: ArticleMetadata
  ): Promise<{ media_id: string; url: string }> {
    // 1. 调用微信 API 创建草稿
    // 2. 返回 media_id（用于后续编辑/发布）
    // 3. 保存到 Obsidian Frontmatter
  }

  async updateDraft(media_id: string, content: string): Promise<void> {
    // 更新已有的草稿
  }

  async publish(media_id: string, schedule?: Date): Promise<string> {
    // 发布草稿或定时发布
    // 返回最终的文章 URL
  }
}
```

**工作流**:
```
Doocs 编辑完成
  ↓ (点击 "Send to WeChat")
Bridge → WeChat API
  ↓
微信后台创建草稿
  ↓
用户在微信后台最后审核
  ↓
点击"发布"按钮
```

---

### **第 3 层：高级特性** (可选)

#### 建议 7: 内容预发布检查

**目的**: 自动化的内容质量检查

```typescript
class PublishChecker {
  check(content: string): CheckResult {
    return {
      wordCount: this.countWords(content),
      imageCount: this.countImages(content),
      codeBlockCount: this.countCodeBlocks(content),
      warnings: [
        this.checkTitle(),      // 标题是否过长？
        this.checkLinks(),      // 链接是否有效？
        this.checkImages(),     // 图片是否存在？
        this.checkFormatting(), // 格式是否合规？
      ],
      readyToPublish: warnings.length === 0
    };
  }
}
```

---

#### 建议 8: 多版本对比与回滚

**目的**: 追踪内容变化，支持版本回滚

```typescript
class VersionManager {
  async saveVersion(fileId: string, content: string): Promise<void> {
    // 每次编辑时自动保存版本
    // 压缩存储，节省空间
  }

  async listVersions(fileId: string): Promise<Version[]> {
    // 获取所有版本及其元数据
  }

  async rollback(fileId: string, versionId: string): Promise<void> {
    // 回滚到指定版本
  }

  async diff(v1: string, v2: string): Promise<DiffResult> {
    // 对比两个版本的差异
  }
}
```

---

## 第五部分：优化实施路线图

### 🚀 分阶段实施计划

#### **Phase 1: 基础增强** (1-2 周)
- ✅ 在 Doocs 中添加 Frontmatter 编辑器
- ✅ 实现文件浏览器
- ✅ 样式预设管理

#### **Phase 2: 中间件层** (2-3 周)
- ✅ 创建 obsidian-bridge 服务
- ✅ 实现双向文件同步
- ✅ 发布状态追踪

#### **Phase 3: WeChat 集成** (3-4 周)
- ✅ WeChat API 集成
- ✅ 自动创建草稿
- ✅ 一键发布功能

#### **Phase 4: 高级特性** (可选，持续改进)
- ✅ 发布前检查
- ✅ 版本管理与回滚
- ✅ 发布分析报表

---

## 第六部分：代码示例

### 示例 1: Frontmatter 编辑器的集成

```typescript
// tools/obsidian-bridge/modules/frontmatter-editor.ts

import * as YAML from 'js-yaml';

export interface ArticleMetadata {
  title: string;
  author?: string;
  tags?: string[];
  category?: string;
  summary?: string;
  publish_date?: string;
  published: boolean;
  weixin_media_id?: string;
  weixin_url?: string;
  attachments?: string[];
}

export class FrontmatterHandler {
  private readonly DELIMITER = '---';

  /**
   * 从 Markdown 内容中提取 Frontmatter
   */
  extractFrontmatter(content: string): {
    metadata: ArticleMetadata;
    body: string;
  } {
    if (!content.startsWith(this.DELIMITER)) {
      return { metadata: this.getDefaults(), body: content };
    }

    const parts = content.split(this.DELIMITER);
    if (parts.length < 3) {
      return { metadata: this.getDefaults(), body: content };
    }

    try {
      const metadata = YAML.load(parts[1]) as ArticleMetadata;
      const body = parts.slice(2).join(this.DELIMITER);
      return { metadata, body };
    } catch (e) {
      console.error('Failed to parse frontmatter:', e);
      return { metadata: this.getDefaults(), body: content };
    }
  }

  /**
   * 将 Frontmatter 和内容合并
   */
  mergeFrontmatter(metadata: ArticleMetadata, body: string): string {
    const yamlStr = YAML.dump(metadata, { indent: 2 });
    return `${this.DELIMITER}\n${yamlStr}${this.DELIMITER}\n${body}`;
  }

  private getDefaults(): ArticleMetadata {
    return {
      title: 'Untitled',
      published: false,
    };
  }
}
```

### 示例 2: 文件同步服务

```typescript
// tools/obsidian-bridge/services/sync-service.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { FrontmatterHandler } from '../modules/frontmatter-editor';

export class FileSync {
  constructor(
    private vaultPath: string,
    private frontmatter: FrontmatterHandler
  ) {}

  /**
   * 从 Doocs 保存回 Obsidian Vault
   */
  async saveToVault(fileId: string, content: string): Promise<void> {
    const { metadata, body } = this.frontmatter.extractFrontmatter(content);

    // 更新发布时间戳
    metadata.publish_date = new Date().toISOString().split('T')[0];

    const merged = this.frontmatter.mergeFrontmatter(metadata, body);
    const filePath = path.join(this.vaultPath, 'articles', `${fileId}.md`);

    await fs.writeFile(filePath, merged, 'utf-8');
    console.log(`✅ Saved: ${filePath}`);
  }

  /**
   * 从 Obsidian 打开文件到 Doocs
   */
  async openFromVault(fileId: string): Promise<string> {
    const filePath = path.join(this.vaultPath, 'articles', `${fileId}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  /**
   * 列出所有文章
   */
  async listFiles(): Promise<Array<{ id: string; metadata: any; preview: string }>> {
    const articlesPath = path.join(this.vaultPath, 'articles');
    const files = await fs.readdir(articlesPath);

    return Promise.all(
      files
        .filter(f => f.endsWith('.md'))
        .map(async (file) => {
          const content = await fs.readFile(
            path.join(articlesPath, file),
            'utf-8'
          );
          const { metadata, body } = this.frontmatter.extractFrontmatter(content);
          return {
            id: file.replace('.md', ''),
            metadata,
            preview: body.substring(0, 100) + '...',
          };
        })
    );
  }
}
```

---

## 总结

### 核心建议排序（按优先级）

| 优先级 | 建议 | 难度 | 效果 | 工作量 |
|--------|------|------|------|--------|
| 🔴 高 | Frontmatter 编辑器 | 低 | 高 | 1-2天 |
| 🔴 高 | 文件浏览器 | 低 | 中 | 1天 |
| 🟡 中 | 样式预设 | 低 | 中 | 1-2天 |
| 🟡 中 | Obsidian Bridge | 中 | 高 | 3-5天 |
| 🟡 中 | 发布状态追踪 | 中 | 高 | 2-3天 |
| 🔵 低 | WeChat 集成 | 高 | 最高 | 5-7天 |
| 🔵 低 | 版本管理 | 高 | 中 | 3-4天 |

### 建议采纳方案

**短期（1-2 周）**: 
- 实现 Phase 1 所有功能
- Doocs 本身变成一个更好的内容管理工具

**中期（2-4 周）**:
- 实现 Phase 2（Bridge 层）
- 建立完整的内容同步工作流

**长期（可选）**:
- 实现 Phase 3（WeChat 集成）
- 一键从编辑到发布的完整自动化

---

## 参考资源

- Doocs GitHub: https://github.com/doocs/md
- WeChat Official API: https://developers.weixin.qq.com/doc/offiaccount/
- gray-matter (YAML 解析): https://github.com/jonschlinkert/gray-matter
