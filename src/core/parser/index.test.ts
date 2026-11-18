/**
 * @file src/core/parser/index.test.ts
 * @description Parser 单元测试
 */

import { MarkdownParser, DocumentMetadata, ParsedDocument } from './index';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parseContent - 带 Frontmatter 的文档', () => {
    it('应该正确解析 YAML Frontmatter 和正文', () => {
      const content = `---
title: "测试标题"
author: "作者名"
tags: ["标签1", "标签2"]
category: "测试分类"
summary: "这是一个测试摘要"
publish_date: 2024-09-23
published: false
---

# 测试标题

这是文章的正文内容。

## 子标题

更多内容...`;

      const result = parser.parseContent(content);

      expect(result.metadata.title).toBe('测试标题');
      expect(result.metadata.author).toBe('作者名');
      expect(result.metadata.tags).toEqual(['标签1', '标签2']);
      expect(result.metadata.category).toBe('测试分类');
      expect(result.metadata.summary).toBe('这是一个测试摘要');
      expect(result.metadata.publishDate).toBe('2024-09-23');
      expect(result.metadata.published).toBe(false);
      expect(result.content).toContain('# 测试标题');
      expect(result.content).toContain('更多内容');
    });

    it('应该处理可选的 Frontmatter 字段', () => {
      const content = `---
title: "最小 Frontmatter"
---

正文`;

      const result = parser.parseContent(content);

      expect(result.metadata.title).toBe('最小 Frontmatter');
      expect(result.metadata.author).toBeUndefined();
      expect(result.metadata.tags).toBeUndefined();
      expect(result.content).toContain('正文');
    });

    it('应该处理 published 和 weixinMediaId', () => {
      const content = `---
title: "已发布文章"
published: true
weixin_media_id: "media123"
weixin_url: "https://mp.weixin.qq.com/..."
---

正文`;

      const result = parser.parseContent(content);

      expect(result.metadata.published).toBe(true);
      expect(result.metadata.weixinMediaId).toBe('media123');
      expect(result.metadata.weixinUrl).toBe('https://mp.weixin.qq.com/...');
    });
  });

  describe('parseContent - 无 Frontmatter 的文档', () => {
    it('应该从 H1 标题提取标题', () => {
      const content = `# 从H1提取的标题

这是正文内容。`;

      const result = parser.parseContent(content);

      expect(result.metadata.title).toBe('从H1提取的标题');
      expect(result.content).toContain('这是正文内容');
    });

    it('应该从 H2 标题提取标题', () => {
      const content = `## 从H2提取的标题

内容`;

      const result = parser.parseContent(content);

      expect(result.metadata.title).toBe('从H2提取的标题');
    });

    it('应该为缺少标题的文档设置默认标题', () => {
      const content = `这是纯文本内容，没有任何 Markdown 标题。`;

      const result = parser.parseContent(content);

      expect(result.metadata.title).toBe('Untitled');
      expect(result.content).toContain('这是纯文本内容');
    });
  });

  describe('validateMetadata', () => {
    it('应该接受有效的元数据', () => {
      const metadata: DocumentMetadata = {
        title: '有效标题'
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝缺少 title 的元数据', () => {
      const metadata: any = {
        author: '作者'
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('title'));
    });

    it('应该拒绝空字符串标题', () => {
      const metadata: DocumentMetadata = {
        title: ''
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(false);
    });

    it('应该拒绝 published=true 但无 weixin_media_id', () => {
      const metadata: any = {
        title: '标题',
        published: true
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('weixin_media_id'));
    });

    it('应该验证 publish_date 格式', () => {
      const metadata: any = {
        title: '标题',
        publish_date: '不是日期'
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('ISO8601'));
    });

    it('应该接受正确格式的 publish_date', () => {
      const metadata: any = {
        title: '标题',
        publishDate: '2024-09-23'
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(true);
    });

    it('应该验证 tags 是数组', () => {
      const metadata: any = {
        title: '标题',
        tags: '不是数组'
      };

      const result = parser.validateMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('tags'));
    });
  });

  describe('transformMetadata', () => {
    it('应该将 YAML snake_case 转换为 camelCase', () => {
      const content = `---
title: "标题"
publish_date: 2024-09-23
weixin_media_id: "media123"
weixin_url: "https://..."
---

正文`;

      const result = parser.parseContent(content);

      expect(result.metadata.publishDate).toBe('2024-09-23');
      expect(result.metadata.weixinMediaId).toBe('media123');
      expect(result.metadata.weixinUrl).toBe('https://...');
    });

    it('应该处理 tags 数组和单值', () => {
      // 测试数组格式
      const contentArray = `---
title: "标题"
tags: ["tag1", "tag2"]
---

正文`;

      const resultArray = parser.parseContent(contentArray);
      expect(resultArray.metadata.tags).toEqual(['tag1', 'tag2']);

      // 测试单值格式
      const contentSingle = `---
title: "标题"
tags: "单个标签"
---

正文`;

      const resultSingle = parser.parseContent(contentSingle);
      expect(resultSingle.metadata.tags).toEqual(['单个标签']);
    });
  });
});
