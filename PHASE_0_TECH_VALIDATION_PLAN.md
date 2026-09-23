# Phase 0：前置技术验证计划

**版本**: v1.0  
**状态**: 待执行  
**时间**: 第 1 周（5-7 个工作日）

---

## 📋 验证概览

### 核心问题

该项目涉及 **3 个关键的技术集成**：

1. **Obsidian → 我们的系统** (Vault API 集成)
2. **我们的系统 → Doocs** (排版渲染)
3. **我们的系统 → WeChat** (发布 API)

本阶段需要验证这 3 个集成的**可行性**、**稳定性**和**兼容性**。

### 验证目标

```
❓ 核心问题 1: Doocs 输出的 HTML 能否直接用于 WeChat 发布？
❓ 核心问题 2: 图片、代码块、公式等复杂元素如何处理？
❓ 核心问题 3: Doocs 如何本地集成？(Puppeteer 还是 npm CLI？)
```

---

## 🔍 验证任务清单

### Task 1: HTML 兼容性测试 (2-3 天)

**目标**: 验证 Doocs → WeChat HTML 转换的兼容性

#### 1.1 准备测试文章

创建一篇包含各种格式的测试 Markdown：

```markdown
# 标题测试

## 大标题
### 小标题

## 文本格式
**加粗** *斜体* ~~删除线~~ `代码`

## 代码块
\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

## 列表
- 无序列表 1
- 无序列表 2
  - 嵌套列表

1. 有序列表 1
2. 有序列表 2

## 表格
| 列1 | 列2 |
|-----|-----|
| 单元格1 | 单元格2 |
| 单元格3 | 单元格4 |

## 图片
![测试图片](https://via.placeholder.com/300)

## 链接
[链接文本](https://example.com)

## 数学公式 (KaTeX)
$$E = mc^2$$

## 行内公式
这是行内公式 $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$

## 引用
> 这是一个引用
> 多行引用

## Mermaid 图表
\`\`\`mermaid
graph LR
  A[开始] --> B[处理] --> C[结束]
\`\`\`
```

#### 1.2 使用 Doocs 渲染

步骤：
1. 访问 https://md.doocs.org
2. 粘贴上述测试内容
3. 选择合适的 CSS 主题
4. **获取输出的 HTML** (浏览器开发者工具)

#### 1.3 查看 Doocs 输出的 HTML 结构

使用浏览器开发者工具（F12）：
```javascript
// 在浏览器控制台执行
copy(document.querySelector('.output-html').innerHTML)
// 或
copy(document.querySelector('[class*="preview"]').innerHTML)
```

保存为 `doocs-output.html`

#### 1.4 测试提交到 WeChat API

**准备**:
- 需要一个有开发者权限的微信公众号
- 获取 appid 和 appsecret

**步骤**:

```bash
# 1. 获取 Access Token
curl -X GET "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=YOUR_APPID&secret=YOUR_APPSECRET"

# 响应示例
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}

# 2. 保存草稿 (测试 HTML 兼容性)
curl -X POST \
  "https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      {
        "title": "测试文章",
        "author": "测试",
        "content": "<!-- 粘贴 Doocs 输出的 HTML -->",
        "content_source_url": "https://example.com"
      }
    ]
  }'

# 响应示例
{
  "media_id": "xxx",
  "type": "news"
}
```

**也可用 Node.js 脚本**:

```typescript
// test-wechat-html.ts
import axios from 'axios';
import * as fs from 'fs';

const APPID = process.env.WECHAT_APPID;
const APPSECRET = process.env.WECHAT_APPSECRET;

async function testWechatHTML() {
  // 1. 获取 Access Token
  const tokenRes = await axios.get(
    `https://api.weixin.qq.com/cgi-bin/token`,
    {
      params: {
        grant_type: 'client_credential',
        appid: APPID,
        secret: APPSECRET,
      },
    }
  );

  const accessToken = tokenRes.data.access_token;
  console.log('✅ Access Token 获取成功');

  // 2. 读取 Doocs 输出的 HTML
  const html = fs.readFileSync('./doocs-output.html', 'utf-8');

  // 3. 提交草稿
  const draftRes = await axios.post(
    'https://api.weixin.qq.com/cgi-bin/draft/add',
    {
      articles: [
        {
          title: '【测试】HTML 兼容性验证',
          author: '测试',
          content: html,
          content_source_url: 'https://example.com/test',
        },
      ],
    },
    {
      params: { access_token: accessToken },
    }
  );

  const mediaId = draftRes.data.media_id;
  console.log('✅ 草稿保存成功，media_id:', mediaId);

  // 4. 输出结果供查看
  console.log('\n请在微信公众号编辑器中查看草稿效果');
  console.log('公众号网址: https://mp.weixin.qq.com/');
}

testWechatHTML().catch(console.error);
```

#### 1.5 在编辑器中查看效果

1. 登录微信公众平台: https://mp.weixin.qq.com/
2. 进入「素材管理」→「草稿箱」
3. 查看刚才上传的草稿
4. 检查以下内容：
   - ✅ 标题、文本显示是否正常
   - ✅ 代码块、表格显示
   - ✅ 图片显示
   - ✅ 链接是否可点击
   - ❌ 样式丢失或错误
   - ❌ 特殊元素 (公式、Mermaid 图) 是否支持

#### 1.6 记录问题

创建 `TEST_REPORT.md`：

```markdown
# HTML 兼容性测试报告

## 测试内容
- 测试时间: 2024-09-23
- Doocs 版本: (截图版本)
- WeChat 发布日期: 2024-09-23

## 测试结果

### 支持 ✅
- [ ] 基础文本格式
- [ ] 代码块
- [ ] 表格
- [ ] 列表
- [ ] 图片
- [ ] 链接

### 部分支持 ⚠️
- [ ] 公式 (KaTeX) - 显示为图片/文本
- [ ] Mermaid 图表 - 显示为图片/文本

### 不支持 ❌
- [ ] (记录具体问题)

## 样式问题
- [ ] 代码块背景色丢失
- [ ] 行间距不一致
- [ ] (其他问题)

## 建议
1. ...
2. ...

## 结论
HTML 兼容性: **90% 兼容** ✅ / **需要清理转换** ⚠️ / **无法使用** ❌
```

---

### Task 2: 图片处理验证 (1-2 天)

**目标**: 验证图片上传和替换的完整流程

#### 2.1 研究 WeChat 图片上传 API

参考文档: https://developers.weixin.qq.com/doc/subscription/

关键 API：
```
POST /cgi-bin/media/upload
  参数: type=image
  返回: media_id
```

#### 2.2 实现图片上传 PoC

```typescript
// upload-image.ts
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

async function uploadImageToWechat(
  imagePath: string,
  accessToken: string
): Promise<string> {
  const form = new FormData();
  form.append('media', fs.createReadStream(imagePath));

  const res = await axios.post(
    'https://api.weixin.qq.com/cgi-bin/media/upload',
    form,
    {
      params: {
        access_token: accessToken,
        type: 'image',
      },
      headers: form.getHeaders(),
    }
  );

  return res.data.media_id; // 返回 media_id
}

// 使用示例
async function test() {
  const mediaId = await uploadImageToWechat(
    './test-image.png',
    accessToken
  );
  console.log('上传成功，media_id:', mediaId);
}
```

#### 2.3 验证图片替换流程

```
原始 HTML:
<img src="https://via.placeholder.com/300">

转换后 HTML:
<img src="图片media_id">
```

测试步骤：
1. 上传图片到 WeChat 获得 media_id
2. 在 HTML 中替换图片 URL
3. 提交到 /draft/add
4. 在编辑器中查看图片显示

#### 2.4 记录文档

```markdown
# 图片处理方案

## 流程
1. 下载 Doocs HTML 中的所有图片
2. 上传到 WeChat 获得 media_id
3. 替换 HTML 中的 src
4. 提交到 WeChat API

## 支持的图片格式
- jpg, png, gif, bmp

## 限制
- 文件大小: <= 5MB
- 保留期限: 3天 (临时素材)

## 代码实现
[见 src/services/wechat/image-uploader.ts]
```

---

### Task 3: Doocs 渲染方案选择 (2-3 天)

**目标**: 选择最优的 Doocs 集成方案

#### 3.1 方案 A: Puppeteer 浏览器自动化

**实现**:

```typescript
// doocs-render-puppeteer.ts
import puppeteer from 'puppeteer';

export async function renderWithDoocs(markdown: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: 'new', // 无头模式
  });

  try {
    const page = await browser.newPage();

    // 1. 打开 Doocs 编辑器
    await page.goto('https://md.doocs.org', {
      waitUntil: 'networkidle2',
    });

    // 2. 等待编辑器加载
    await page.waitForSelector('[contenteditable="true"]', {
      timeout: 5000,
    });

    // 3. 注入 Markdown 内容
    await page.focus('[contenteditable="true"]');
    await page.keyboard.type(markdown);

    // 4. 等待渲染完成
    await page.waitForTimeout(2000);

    // 5. 获取预览 HTML
    const html = await page.evaluate(() => {
      const preview = document.querySelector('.preview-html');
      return preview?.innerHTML || '';
    });

    return html;
  } finally {
    await browser.close();
  }
}
```

**性能测试**:
```bash
# 渲染耗时（毫秒）
- 启动浏览器: 2000-3000ms
- 打开网页: 1000-2000ms
- 注入内容: 100-200ms
- 渲染等待: 2000ms
- 获取 HTML: 100ms
- 关闭浏览器: 500-1000ms
━━━━━━━━━━━━━━━━━━━━━━
总耗时: 约 6-8 秒 (单篇文章)
```

**优点**:
- ✅ 与网页版完全一致
- ✅ 支持所有 Doocs 特性
- ✅ 可靠性高

**缺点**:
- ❌ 占用内存 (每次 200-500MB)
- ❌ 速度慢 (6-8秒/篇)
- ❌ 需要 Chromium/Chrome

#### 3.2 方案 B: npm CLI 本地服务

**安装**:
```bash
npm install -g @doocs/md-cli
md-cli --port 8800
```

**服务运行后**:
```
http://localhost:8800
```

**逆向工程** (了解 HTTP 接口):

使用浏览器开发者工具（Network 标签）：
1. 在网页中编辑内容
2. 观察发送的 HTTP 请求
3. 记录请求格式
4. 在我们的代码中重现

**可能的接口** (待验证):
```javascript
// 猜测的接口
POST http://localhost:8800/api/render
{
  "markdown": "# 标题\n内容"
}

Response:
{
  "html": "<h1>标题</h1><p>内容</p>"
}
```

**性能测试**:
```bash
- 启动服务: 1次 (长期运行)
- 单次渲染: 100-500ms (快速!)
- 总耗时: ~200ms (单篇文章)
```

**优点**:
- ✅ 速度快 (200ms/篇)
- ✅ 资源占用少
- ✅ 离线运行

**缺点**:
- ❌ 无官方 API 文档
- ❌ 需要逆向工程
- ❌ 官方版本更新可能破坏

#### 3.3 对比表

| 项目 | Puppeteer | npm CLI |
|------|-----------|---------|
| 速度 | 慢 (6-8s) | 快 (200ms) |
| 资源占用 | 高 (300MB+) | 低 (50MB) |
| 可靠性 | 高 | 中等 |
| 官方支持 | 高 | 无 |
| 文档完整度 | 完整 | 无 |
| 推荐度 | ⭐⭐⭐⭐ | ⭐⭐⭐ |

#### 3.4 推荐方案

**建议选择: Puppeteer** (稍作优化)

原因:
1. 官方支持和文档完整
2. 兼容性最高
3. 虽然慢，但可以：
   - 使用浏览器复用（不每次都关闭）
   - 批量处理（减少启动次数）
   - 异步后台处理（不阻塞用户）

**优化方案**:
```typescript
class DoocsRenderer {
  private browser: Browser;
  
  async init() {
    this.browser = await puppeteer.launch(); // 1次
  }
  
  async render(markdown: string) {
    // 复用浏览器
    const page = await this.browser.newPage();
    // ... 渲染逻辑
    await page.close(); // 只关闭页面，不关闭浏览器
  }
  
  async destroy() {
    await this.browser.close(); // 最后才关闭
  }
}
```

**优化后耗时**: 6-8s → 1-2s (后续渲染)

#### 3.5 测试代码

在项目中创建：
```
tests/doocs-render/
├── puppeteer.test.ts
├── npm-cli.test.ts
└── performance.test.ts
```

---

## 📊 验证检查清单

### Week 1 Daily Tasks

```
Monday (Task 1 开始)
- [ ] 09:00 准备测试文章
- [ ] 10:00 使用 Doocs 渲染
- [ ] 11:00 获取 HTML 代码

Tuesday (Task 1 继续)
- [ ] 09:00 配置微信 API 测试环境
- [ ] 10:00 提交测试草稿
- [ ] 14:00 检查编辑器效果
- [ ] 15:00 整理兼容性问题

Wednesday (Task 1 完成 + Task 2 开始)
- [ ] 09:00 完成兼容性报告
- [ ] 10:00 研究图片上传 API
- [ ] 14:00 实现图片上传 PoC

Thursday (Task 2 继续)
- [ ] 09:00 测试图片替换流程
- [ ] 14:00 整理图片处理文档

Friday (Task 3)
- [ ] 09:00 Puppeteer PoC 实现
- [ ] 14:00 npm CLI 逆向工程
- [ ] 16:00 性能测试对比
- [ ] 17:00 方案选择和记录
```

---

## 📋 验收标准

验证完成时需要提交：

- [ ] ✅ HTML 兼容性报告 (`TEST_REPORT_HTML.md`)
- [ ] ✅ 图片处理方案文档 (`IMAGE_HANDLING.md`)
- [ ] ✅ Doocs 集成方案确定 (`DOOCS_INTEGRATION_PLAN.md`)
- [ ] ✅ 风险评估更新 (`TECH_FEASIBILITY_UPDATED.md`)
- [ ] ✅ 测试代码和示例 (`tests/phase-0/`)

### 获批标准

- [ ] 无重大技术障碍发现
- [ ] 所有关键集成点已验证
- [ ] 有具体的解决方案
- [ ] 用户确认同意继续

---

## 🚀 后续步骤

验证完成后：

1. **修改项目计划** (如有必要)
2. **提交验证报告** 给用户审批
3. **用户确认** 后开始 Phase 1
4. **基于验证结果** 调整开发计划

---

**预期完成日期**: 第 1 周 (5-7 个工作日)

**下一步**: 分配任务给开发人员，按照上述计划执行。

