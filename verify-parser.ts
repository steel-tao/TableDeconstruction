/**
 * @file verify-parser.ts
 * @description Parser 功能验证脚本（不依赖 Jest）
 * 运行方式: npx ts-node verify-parser.ts
 */

import { MarkdownParser, DocumentMetadata } from './src/core/parser/index';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

// ============ 运行测试 ============

const parser = new MarkdownParser();

console.log('\n📋 Parser 功能验证\n');

// 测试 1：解析带 Frontmatter 的文档
test('应该正确解析 YAML Frontmatter 和正文', () => {
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

这是文章的正文内容。`;

  const result = parser.parseContent(content);

  assertEquals(result.metadata.title, '测试标题', 'title 不匹配');
  assertEquals(result.metadata.author, '作者名', 'author 不匹配');
  assertEquals(result.metadata.tags, ['标签1', '标签2'], 'tags 不匹配');
  assertEquals(result.metadata.category, '测试分类', 'category 不匹配');
  assertEquals(result.metadata.summary, '这是一个测试摘要', 'summary 不匹配');
  assertEquals(result.metadata.publishDate, '2024-09-23', 'publishDate 不匹配');
  assertEquals(result.metadata.published, false, 'published 不匹配');
  assertTrue(result.content.includes('# 测试标题'), 'content 缺少标题');
  assertTrue(result.content.includes('这是文章的正文内容'), 'content 缺少正文');
});

// 测试 2：处理最小 Frontmatter
test('应该处理只有 title 的最小 Frontmatter', () => {
  const content = `---
title: "最小 Frontmatter"
---

正文`;

  const result = parser.parseContent(content);

  assertEquals(result.metadata.title, '最小 Frontmatter');
  assertEquals(result.metadata.author, undefined);
  assertEquals(result.metadata.tags, undefined);
  assertTrue(result.content.includes('正文'));
});

// 测试 3：处理 published 和 weixinMediaId
test('应该处理 published 和 weixin_media_id', () => {
  const content = `---
title: "已发布文章"
published: true
weixin_media_id: "media123"
weixin_url: "https://mp.weixin.qq.com/..."
---

正文`;

  const result = parser.parseContent(content);

  assertEquals(result.metadata.published, true);
  assertEquals(result.metadata.weixinMediaId, 'media123');
  assertEquals(result.metadata.weixinUrl, 'https://mp.weixin.qq.com/...');
});

// 测试 4：从 H1 提取标题
test('应该从 H1 标题提取标题', () => {
  const content = `# 从H1提取的标题

这是正文内容。`;

  const result = parser.parseContent(content);

  assertEquals(result.metadata.title, '从H1提取的标题');
  assertTrue(result.content.includes('这是正文内容'));
});

// 测试 5：从 H2 提取标题
test('应该从 H2 标题提取标题', () => {
  const content = `## 从H2提取的标题

内容`;

  const result = parser.parseContent(content);

  assertEquals(result.metadata.title, '从H2提取的标题');
});

// 测试 6：缺少标题时设置默认值
test('应该为缺少标题的文档设置默认标题', () => {
  const content = `这是纯文本内容，没有任何 Markdown 标题。`;

  const result = parser.parseContent(content);

  assertEquals(result.metadata.title, 'Untitled');
  assertTrue(result.content.includes('这是纯文本内容'));
});

// 测试 7：验证有效的元数据
test('应该接受有效的元数据', () => {
  const metadata: DocumentMetadata = {
    title: '有效标题'
  };

  const result = parser.validateMetadata(metadata);

  assertEquals(result.valid, true);
  assertEquals(result.errors, undefined);
});

// 测试 8：拒绝缺少 title 的元数据
test('应该拒绝缺少 title 的元数据', () => {
  const metadata: any = {
    author: '作者'
  };

  const result = parser.validateMetadata(metadata);

  assertEquals(result.valid, false);
  assertTrue(result.errors?.some(e => e.includes('title')));
});

// 测试 9：拒绝空字符串标题
test('应该拒绝空字符串标题', () => {
  const metadata: DocumentMetadata = {
    title: ''
  };

  const result = parser.validateMetadata(metadata);

  assertEquals(result.valid, false);
});

// 测试 10：拒绝 published=true 但无 weixin_media_id
test('应该拒绝 published=true 但无 weixin_media_id', () => {
  const metadata: any = {
    title: '标题',
    published: true
  };

  const result = parser.validateMetadata(metadata);

  assertEquals(result.valid, false);
  assertTrue(result.errors?.some(e => e.includes('weixin_media_id')));
});

// ============ 输出结果 ============

console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\n测试结果: ${passed}/${total} 通过\n`);

if (passed < total) {
  console.log('❌ 失败的测试:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('✅ 所有测试通过！\n');
  process.exit(0);
}
