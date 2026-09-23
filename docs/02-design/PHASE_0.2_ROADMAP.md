# Phase 0.2 简化路线图：Obsidian → Doocs 本地集成验证

**文档日期**: 2026-09-23  
**阶段**: Phase 0.2 - Obsidian → Doocs 集成验证  
**时间框架**: 1-2 天（轻量级）  
**核心目标**: 验证从 Obsidian 提取文档到 Doocs 格式转换的完整链路

---

## 整体流程

```
Obsidian 资料库 (G:\Obsidian\wechat\桌面解构)
  ↓ 用户选择 1 篇文章
  
文档提取工具 (轻量级读取器)
  ↓ 读取 Markdown 内容
  
Doocs 本地服务 (http://127.0.0.1:55885)
  ↓ 转换为微信排版格式
  
Copy 按钮 (用户手工复制)
  ↓ 获得微信可用的 HTML
  
微信公众号后台 (手工发布)
  ↓ 粘贴 → 发布（每天 1 条）
```

**关键原则**：
- ✅ Obsidian 侧：只需提供干净的 Markdown
- ✅ Doocs 侧：只需格式转换和预览
- ✅ WeChat 侧：用户手工复制和发布
- ❌ 不做：批量处理、自动分篇、自动排期

---

## 核心任务分解（4 个任务）

### Task 0.2.1: Doocs 能力深度验证（Day 1 前半）

**目标**: 确认 Doocs 可以直接转换您的实际文章，输出可粘贴到微信的格式

**验证步骤**:

1. **准备测试内容**
   - 选择 1 篇现有文章（推荐"商业篇"）
   - 手工复制其 Markdown 内容

2. **在本地 Doocs 中测试转换**
   - 粘贴 Markdown 到编辑框
   - 观察实时预览效果
   - 验证样式是否符合微信排版

3. **测试 Copy 功能**
   - 点击 Copy 按钮
   - 验证获得的内容是否可以直接粘贴到微信
   - 检查格式、链接、代码块等的兼容性

4. **记录发现**
   - 哪些语法支持良好？
   - 哪些需要调整？
   - Doocs 的限制是什么？

**产出**:
- `DOOCS_CAPABILITY_REPORT.md` — Doocs 能力验证报告
  - 支持的语法列表
  - 不支持或需调整的语法
  - 输出格式兼容性说明
  - 使用建议

**时间**: 1-2 小时

---

### Task 0.2.2: 文档提取工具实现（Day 1 后半）

**目标**: 实现从 Obsidian Vault 读取指定文档并提取干净的 Markdown

**需要实现的功能**:

```typescript
interface VaultDocument {
  id: string;              // 文档ID
  filename: string;        // 文件名
  title: string;          // 提取的标题
  content: string;        // 干净的 Markdown 内容
  wordCount: number;      // 字数统计
  estimatedReadTime: number; // 估计阅读时间
}

class ObsidianVaultReader {
  // 1. 列举 Vault 中的所有文档（用于浏览）
  async listDocuments(): Promise<VaultDocument[]>;
  
  // 2. 按系列分组（便于查找）
  async listBySeries(): Promise<Map<string, VaultDocument[]>>;
  
  // 3. 读取指定文档
  async readDocument(filename: string): Promise<VaultDocument>;
  
  // 4. 输出干净的 Markdown（可直接粘贴到 Doocs）
  async exportMarkdown(filename: string): Promise<string>;
}
```

**实现范围**:
- ✅ 安全地扫描 Vault 目录
- ✅ 过滤 `.obsidian` 系统文件和附件
- ✅ 读取 Markdown 文件内容
- ✅ 基础的文件统计（字数、标题）
- ❌ 不需要解析 Frontmatter（您现有文档没有）
- ❌ 不需要格式转换（直接输出原始 Markdown）

**代码位置**:
- `src/services/vault-reader.ts` — Vault 读取服务
- `src/commands/extract.ts` — CLI 命令：提取文档

**产出**:
- 能通过 CLI 命令提取任意文档
- 示例：`node extract.ts --file "商业篇"`
- 输出干净的 Markdown 文本

**时间**: 1-2 小时

---

### Task 0.2.3: CLI 工具集成（Day 2 前半）

**目标**: 搭建简单的命令行工具，便于用户快速选择和导出文档

**需要的 CLI 命令**:

```bash
# 1. 列表：显示 Vault 中所有文档
node cli.js list
# 输出:
# ├─ 深度解构AI冷战：透视大厂、白宫与跨国算力洗牌的刚性因果
# │  ├─ 01 商业篇《硅谷的合规算盘...》  [3000字, 6分钟]
# │  ├─ 02 政策篇：加州SB 1047...      [3500字, 7分钟]
# │  └─ 03 突围篇：中方的技术突围...    [2800字, 5分钟]
# └─ 石板亚纪
#    ├─ 01 1000人手工数据库与高端服务业... [3100字, 6分钟]
#    └─ ...

# 2. 提取：获取指定文档的 Markdown
node cli.js extract --file "商业篇" > output.md

# 3. 统计：获取 Vault 统计信息
node cli.js stats
# 输出:
# 总文档数: 9
# 总字数: 28500
# 系列数: 2
```

**实现要点**:
- 简单易用，无需复杂参数
- 输出清晰可读
- 支持快速检索（按标题、系列搜索）

**产出**:
- `src/cli.ts` — CLI 入口
- `package.json` 中新增脚本：
  ```json
  {
    "scripts": {
      "vault:list": "node src/cli.ts list",
      "vault:extract": "node src/cli.ts extract",
      "vault:stats": "node src/cli.ts stats"
    }
  }
  ```

**时间**: 1 小时

---

### Task 0.2.4: 端到端工作流演示（Day 2）

**目标**: 完整验证 Obsidian → Doocs → WeChat 的整个链路

**演示流程**:

```
Step 1: 列表查看 Vault 中的文档
  $ npm run vault:list
  输出所有可用文章及其统计信息

Step 2: 选择并提取一篇文章
  $ npm run vault:extract -- --file "商业篇"
  获得干净的 Markdown 文本

Step 3: 复制 Markdown，粘贴到本地 Doocs
  在 Doocs 编辑框中粘贴 Markdown
  观察实时预览效果

Step 4: 点击 Copy 按钮
  获得微信格式的富文本 HTML

Step 5: 粘贴到微信公众号后台
  验证排版效果
  确认可以发布

Step 6: 记录整个过程中的问题
```

**验证清单**:
- [ ] Vault 可以正确列表
- [ ] 文档可以成功提取
- [ ] Markdown 内容干净（无格式错误）
- [ ] Doocs 能正确转换
- [ ] 输出可以直接粘贴到微信
- [ ] 微信排版效果满意

**产出**:
- `PHASE_0.2_VALIDATION_REPORT.md` — 完整验证报告
  - 演示过程记录
  - 发现的问题清单
  - 改进建议
  - 兼容性说明

**时间**: 2-3 小时

---

## 时间分配

| 任务 | 内容 | 时间 | 累计 |
|------|------|------|------|
| 0.2.1 | Doocs 能力验证 | 1-2h | 1-2h |
| 0.2.2 | 文档提取工具 | 1-2h | 2-4h |
| 0.2.3 | CLI 集成 | 1h | 3-5h |
| 0.2.4 | 端到端演示 | 2-3h | 5-8h |
| **总计** | | **5-8h** | ≈ **1-2 天** |

---

## 简化的元数据设计

相比之前的复杂 Frontmatter 设计，Phase 0.2 只需简单的**运行时统计**（不需要在 Frontmatter 中定义）：

```typescript
// 运行时自动计算，不需要 YAML 定义
interface DocumentMetadata {
  filename: string;
  title: string;           // 从 Markdown 第一个标题提取
  wordCount: number;       // 自动计算
  estimatedReadTime: number; // wordCount / 200
  series?: string;         // 从目录路径推断
  createdDate?: Date;      // 从文件信息获取
}
```

**不需要 Frontmatter** 的原因：
- 您现有文档都没有 YAML 头
- 运行时统计就足够了
- 减少维护成本

---

## 验收标准

### Core Outcomes（必须完成）

- [ ] Task 0.2.1: Doocs 能力验证完成，输出兼容性报告
- [ ] Task 0.2.2: 文档提取工具可正常工作
- [ ] Task 0.2.3: CLI 命令可正常执行
- [ ] Task 0.2.4: 完整的工作流演示成功
- [ ] 至少 1 篇文档从 Obsidian 成功发布到微信

### Quality Gates

- [ ] 代码可在 `src/` 中找到，注释清晰
- [ ] 所有产出文档在 `docs/` 中有记录
- [ ] 没有依赖 npm 库（仅用原生 Node.js API）
- [ ] 验证报告详细记录了所有发现的问题和兼容性说明

---

## 后续阶段（Phase 1+）

完成 Phase 0.2 后，可以进行的扩展：

- **Phase 1**: 补充元数据管理（便于内容分类）
- **Phase 2**: WeChat 官方 API 集成（尝试自动发布）
- **Phase 3**: 内容版本控制和归档
- **Phase 4**: 统计分析和数据反馈

但这些都是**后话**，当前阶段只需验证基础的转换链路是否可行。

---

## 相关文档

- [DOOCS_LOCAL_DEPLOYMENT.md](./DOOCS_LOCAL_DEPLOYMENT.md) — Doocs 本地部署验证（Phase 0.1）
- [IMPLEMENTATION_GUIDE.md](../../IMPLEMENTATION_GUIDE.md) — 整体项目规划

---

**文档版本**: 0.2（简化版）  
**最后更新**: 2026-09-23  
**下一步**: 开始 Task 0.2.1
