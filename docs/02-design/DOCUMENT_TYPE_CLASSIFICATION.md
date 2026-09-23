# 文档元数据定义（轻量级）

**版本**: 0.1  
**日期**: 2026-09-23  
**说明**: Phase 0.2 专注于验证 Obsidian → Doocs 链路，暂不需要复杂的元数据系统。本文档定义了未来的扩展方向。

---

## 目前状态

**您现有的 Obsidian 文档**：
- ✅ 格式：纯 Markdown，结构清晰
- ✅ 长度：已控制在 3000-3500 字/篇
- ✅ 阅读时间：5-6 分钟/篇
- ✅ 组织：按系列（目录）分类
- ❌ Frontmatter：暂无 YAML 头部元数据

**当前工作流**：
- 在 Obsidian 中写作和编辑
- 复制 Markdown 文本
- 粘贴到本地 Doocs
- 复制排版后的内容
- 粘贴到微信公众号后台手工发布

**这个流程已经有效**，无需大幅改动。Phase 0.2 的目标仅是将"手工复制"步骤自动化。

---

## 数据结构定义

### VaultDocument（运行时对象）

```typescript
interface VaultDocument {
  // 文件属性
  id: string;              // hash(filepath)
  filepath: string;        // 完整路径：G:\Obsidian\wechat\桌面解构\...
  filename: string;        // 文件名
  relativePath: string;    // 相对路径
  
  // 内容元数据（自动计算）
  title: string;          // 从 Markdown 第一个标题提取
  content: string;        // 原始 Markdown 内容
  wordCount: number;      // 字数
  estimatedReadTime: number; // 估计阅读时间（分钟）
  
  // 分类信息（从目录结构推断）
  series?: string;        // 系列名（从目录名提取）
  seriesIndex?: number;   // 在系列中的位置
  
  // 文件信息
  createdDate: Date;      // 文件创建日期
  modifiedDate: Date;     // 最后修改日期
}
```

### 计算规则

```typescript
// 1. 字数统计（中文）
wordCount = content
  .replace(/[^\u4e00-\u9fff\w]/g, ' ')  // 只计算中文和英文单词
  .split(/\s+/)
  .length;

// 2. 阅读时间
estimatedReadTime = Math.ceil(wordCount / 200);  // 中文 200字/分钟

// 3. 标题提取
title = content
  .match(/^#{1,6}\s+(.+)$/m)?.[1] 
  || filename.replace(/^[\d\s]+/, '').replace(/\.md$/, '');

// 4. 系列推断
series = filepath
  .split(path.sep)
  .slice(-2, -1)[0]  // 倒数第二层目录
  || '未分类';

// 5. 系列索引
seriesIndex = filename
  .match(/^(\d+)\s+/)?.[1] 
  || null;
```

---

## 扩展方向（未来可选）

### 可选的 Frontmatter 元数据

如果将来需要补充元数据（例如标签、分类），可以这样组织：

```yaml
---
# 推荐字段（可选）
category: business       # 分类：business | policy | technology | culture
tags: [AI, 商业, 地缘政治, 硅谷]
description: "切开商业防线的微观博弈结构..."

# 发布相关（当前不需要）
publishStatus: draft     # draft | ready | published
publishDate: 2026-09-23

# 来源和转载
originalSource: null
allowRepublish: true
---
```

**但这仅是参考**。Phase 0.2 不需要实现这些。

---

## 文档类型简化版

### 按 Obsidian 现有内容分类

您的文档可以简单分为两类：

#### 1. Article（系列文章）
- 特征：按序号组织，3000-3500 字，5-6 分钟阅读
- 您的例子："商业篇"、"政策篇"、"突围篇"
- 发布方式：手工选择，逐篇发布
- 处理方式：直接提取 Markdown，无需分篇

#### 2. CaseStudy（案例分析）
- 特征：独立的人物或事件研究，3000-3500 字
- 您的例子："石板亚纪"系列
- 发布方式：独立发布或系列发布
- 处理方式：直接提取 Markdown，无需分篇

**就这样简单**。不需要"快速笔记"、"评论"、"合作内容"等复杂分类。未来需要时再加。

---

## Doocs 兼容性说明

Phase 0.2 需要验证的 Doocs 兼容性问题：

| 特性 | Markdown 写法 | Doocs 支持 | 微信 copy/paste 可用 | 备注 |
|------|--------------|-----------|-----------------|------|
| 标题 | `# H1` ~ `###### H6` | ✅ | ✅ | |
| 粗体 | `**text**` | ✅ | ✅ | |
| 斜体 | `*text*` | ✅ | ✅ | |
| 代码行 | `` `code` `` | ✅ | ✅ | |
| 代码块 | ` ``` ` | ✅ | ✅ | 需验证样式 |
| 列表 | `- item` / `1. item` | ✅ | ✅ | |
| 引用块 | `> quote` | ✅ | ✅ | 需验证样式 |
| 链接 | `[text](url)` | ✅ | ✅ | 需验证是否可点击 |
| 图片 | `![alt](url)` | ✅ | ? | 需验证上传方式 |
| 表格 | Markdown 表格 | ✅ | ? | 需验证排版效果 |
| 数学公式 | `$formula$` | ✅ | ? | KaTeX，需验证 |
| Mermaid 图表 | ` ```mermaid ` | ✅ | ? | 需验证 |

**第 0.2 阶段的 Task 0.2.1 需要完整验证这个表格**。

---

## 与 Doocs 的数据流

```typescript
// 工作流
const vaultReader = new VaultReader('G:\\Obsidian\\wechat\\桌面解构');

// 1. 列表所有文档
const documents = await vaultReader.listDocuments();
// 输出: VaultDocument[]

// 2. 用户选择一篇
const selected = documents.find(d => d.filename.includes('商业篇'));

// 3. 提取干净的 Markdown
const markdown = await vaultReader.exportMarkdown(selected.filename);

// 4. 用户粘贴到 Doocs
// (手工操作：打开浏览器 → 粘贴 → 看预览)

// 5. 点击 Copy 按钮
// (Doocs 输出微信格式的 HTML)

// 6. 用户粘贴到微信公众号
// (手工操作：打开微信后台 → 新建文章 → 粘贴 → 编辑 → 发布)
```

---

## 配置文件位置

所有内容配置都存储在项目根目录的 `config.json`（未来可选）：

```json
{
  "vault": {
    "path": "G:\\Obsidian\\wechat\\桌面解构"
  },
  "doocs": {
    "localUrl": "http://127.0.0.1:55885",
    "themes": ["blue", "orange", "grace", "simple"]
  },
  "wechat": {
    "publishMode": "manual",
    "copyPasteOnly": true
  }
}
```

但 Phase 0.2 中这个配置暂时不需要，可以硬编码路径。

---

## 总结

**Phase 0.2 不需要**：
- ❌ 复杂的文档类型分类系统
- ❌ 自动分篇逻辑
- ❌ 排期发布调度
- ❌ Frontmatter 元数据解析
- ❌ 复杂的内容管理

**Phase 0.2 需要**：
- ✅ 简单的 Vault 读取器
- ✅ 文档列表和检索
- ✅ 干净的 Markdown 导出
- ✅ CLI 工具便捷性
- ✅ Doocs 兼容性验证

**Phase 1+（未来）** 才需要考虑补充元数据、标签系统、版本控制等高级功能。

---

**文档版本**: 0.1  
**最后更新**: 2026-09-23  
**维护者**: 架构设计团队
