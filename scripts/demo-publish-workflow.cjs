#!/usr/bin/env node

/**
 * @file scripts/demo-publish-workflow.cjs
 * @description 发布工作流完整演示 - 展示从 Doocs 编辑到微信发布的完整流程
 * 
 * 这个脚本演示了：
 * 1. 创建发布记录
 * 2. 提交审核
 * 3. 审核通过
 * 4. 发布到微信
 * 5. 查询发布历史
 * 
 * 使用 Mock API 演示，不需要真实微信账号
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message) {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 模拟的发布管理器（简化版）
// ============================================================================

class MockPublishManager {
  constructor() {
    this.records = new Map();
    this.recordCount = 0;
  }

  createRecord(title, content, creator, filePath) {
    const id = `rec_${++this.recordCount}`;
    const record = {
      id,
      title,
      content,
      creator,
      filePath,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(id, record);
    return record;
  }

  submitForReview(recordId, htmlContent) {
    const record = this.records.get(recordId);
    if (!record) return null;
    record.status = 'pending_review';
    record.updatedAt = new Date();
    return record;
  }

  approvePublish(recordId, reviewer, comment) {
    const record = this.records.get(recordId);
    if (!record) return null;
    record.status = 'approved';
    record.reviewer = reviewer;
    record.reviewComment = comment;
    record.updatedAt = new Date();
    return record;
  }

  executePublish(recordId) {
    const record = this.records.get(recordId);
    if (!record) return null;
    record.status = 'published';
    record.wechatMsgId = `msg_${Date.now()}`;
    record.publishedAt = new Date();
    record.updatedAt = new Date();
    return record;
  }

  getRecord(recordId) {
    return this.records.get(recordId) || null;
  }

  listRecords() {
    return Array.from(this.records.values());
  }
}

class MockWechatService {
  constructor() {
    this.initialized = false;
  }

  async init(config) {
    this.initialized = true;
    logSuccess(`WeChat 客户端已初始化 (Mock 模式, AppID: ${config.appId.substring(0, 8)}...)`);
  }

  async getAccessToken() {
    await delay(500); // 模拟网络延迟
    return `mock_token_${Date.now()}`;
  }

  async saveDraft(article) {
    await delay(300);
    return `media_${Date.now()}`;
  }

  async publishArticle(article) {
    await delay(500);
    return `msg_${Date.now()}`;
  }

  async getPublishHistory() {
    return [
      { id: 1, title: 'Previous Article 1', views: 523, likes: 45 },
      { id: 2, title: 'Previous Article 2', views: 1203, likes: 128 },
    ];
  }
}

// ============================================================================
// 演示流程
// ============================================================================

async function runDemo() {
  logSection('微信发布工作流完整演示（Mock 模式）');

  // 初始化
  const publishManager = new MockPublishManager();
  const wechatService = new MockWechatService();

  await wechatService.init({
    appId: 'wx1234567890abcdef',
    appSecret: 'secret_xxxx',
  });

  await delay(1000);

  // ========================================================================
  // Phase 1: 创建发布记录
  // ========================================================================

  logSection('Phase 1: 创建发布记录');

  const article = {
    title: '如何构建高效的内容管理系统',
    content: `
      <h2>简介</h2>
      <p>在现代化的内容运营中，拥有一个高效的管理系统是至关重要的。</p>
      
      <h2>核心要素</h2>
      <ul>
        <li>统一的编辑界面（Doocs）</li>
        <li>灵活的发布工作流</li>
        <li>完整的审核机制</li>
        <li>与微信的无缝集成</li>
      </ul>
      
      <h2>总结</h2>
      <p>通过这个系统，可以大大提高内容运营的效率。</p>
    `,
    creator: 'content_team',
    filePath: '/obsidian-vault/articles/cms-guide.md',
  };

  const record = publishManager.createRecord(
    article.title,
    article.content,
    article.creator,
    article.filePath
  );

  log(`
📝 创建新记录
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ID:      ${record.id}
  标题:    ${record.title}
  创建人:  ${record.creator}
  来源:    ${record.filePath}
  状态:    ${record.status}
  时间:    ${record.createdAt.toLocaleString('zh-CN')}
  `);

  logSuccess(`发布记录已创建`);
  await delay(1500);

  // ========================================================================
  // Phase 2: 编辑和预览
  // ========================================================================

  logSection('Phase 2: 在 Doocs 中编辑');

  log(`
🎨 编辑步骤：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. 打开: http://127.0.0.1:8800/
  2. 粘贴 HTML 内容（已从记录中加载）
  3. 在 Doocs 中进行调整和预览
  4. 点击"复制"获取格式化后的内容
  5. 提交审核

📌 提示：
  - Doocs 提供微信排版预览
  - 支持所有常见的 Markdown 语法
  - 可以预览最终效果后再发布
  `);

  logSuccess(`已在 Doocs 中编辑完成`);
  await delay(1500);

  // ========================================================================
  // Phase 3: 提交审核
  // ========================================================================

  logSection('Phase 3: 提交审核');

  const reviewRecord = publishManager.submitForReview(record.id, article.content);

  log(`
✍️  提交审核信息：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  记录 ID:  ${reviewRecord.id}
  标题:     ${reviewRecord.title}
  现状:     ${reviewRecord.status}
  提交时间: ${reviewRecord.updatedAt.toLocaleString('zh-CN')}
  `);

  logSuccess(`已提交审核`);
  await delay(1500);

  // ========================================================================
  // Phase 4: 审核通过
  // ========================================================================

  logSection('Phase 4: 审核和批准');

  const approvedRecord = publishManager.approvePublish(
    record.id,
    'editor_alice',
    '文章内容质量优秀，排版规范'
  );

  log(`
✅ 审核结果：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  审核人:   ${approvedRecord.reviewer}
  评论:     ${approvedRecord.reviewComment}
  新状态:   ${approvedRecord.status}
  审核时间: ${approvedRecord.updatedAt.toLocaleString('zh-CN')}
  `);

  logSuccess(`审核已通过，可以发布`);
  await delay(1500);

  // ========================================================================
  // Phase 5: 获取微信 Token
  // ========================================================================

  logSection('Phase 5: 准备发布');

  const token = await wechatService.getAccessToken();
  log(`
🔑 获取 WeChat 凭证：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Token: ${token.substring(0, 20)}...
  `);

  logSuccess(`已获取微信 Access Token`);
  await delay(1500);

  // ========================================================================
  // Phase 6: 发布到微信
  // ========================================================================

  logSection('Phase 6: 发布到微信公众号');

  const draftMediaId = await wechatService.saveDraft({
    title: article.title,
    content: article.content,
    author: article.creator,
    digest: '在现代化的内容运营中...',
  });

  logSuccess(`草稿已保存: ${draftMediaId}`);
  await delay(1000);

  const msgId = await wechatService.publishArticle({
    title: article.title,
    content: article.content,
    author: article.creator,
    digest: '在现代化的内容运营中...',
  });

  logSuccess(`文章已发布: ${msgId}`);

  const publishedRecord = publishManager.executePublish(record.id);

  log(`
📤 发布完成：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  微信 Msg ID:     ${publishedRecord.wechatMsgId}
  发布时间:        ${publishedRecord.publishedAt.toLocaleString('zh-CN')}
  当前状态:        ${publishedRecord.status}
  `);

  await delay(1500);

  // ========================================================================
  // Phase 7: 查看发布历史
  // ========================================================================

  logSection('Phase 7: 查看发布历史');

  const history = await wechatService.getPublishHistory();

  log(`
📊 最近发布的文章：
━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  history.forEach((item, idx) => {
    console.log(`
  ${idx + 1}. ${item.title}
     👁️  阅读数: ${item.views}
     👍 点赞数: ${item.likes}`);
  });

  logSuccess(`发布历史加载完成`);
  await delay(1500);

  // ========================================================================
  // 总结
  // ========================================================================

  logSection('工作流完成总结');

  const stats = {
    总记录数: publishManager.listRecords().length,
    已发布: publishManager.listRecords().filter((r) => r.status === 'published').length,
    待审核: publishManager.listRecords().filter((r) => r.status === 'pending_review').length,
  };

  log(`
📈 发布统计：
━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  Object.entries(stats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  log(`
🎯 工作流步骤总结：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Step 1: 创建发布记录
  ✓ Step 2: 在 Doocs 中编辑预览
  ✓ Step 3: 提交审核
  ✓ Step 4: 审核和批准
  ✓ Step 5: 获取微信凭证
  ✓ Step 6: 发布到微信
  ✓ Step 7: 查看发布历史

🔄 下一步操作：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. 配置真实的 WeChat AppID/Secret
  2. 运行验证脚本: npm run test:wechat-api
  3. 切换到真实 API: WECHAT_ADAPTER=real
  4. 在微信公众号后台查看已发布的文章

📝 说明：
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - 本演示使用 Mock API，不需要真实微信账号
  - 所有数据存储在内存中，程序结束后会丢失
  - 完整的生产实现应使用数据库存储
  `);

  logSuccess(`\n演示完成！`);
  console.log(`\n${colors.bold}${colors.cyan}更多信息请查看：${colors.reset}`);
  console.log(`  - 文档: docs/04-user-guide/`);
  console.log(`  - API: src/services/publish/`);
  console.log(`  - 配置: .env.example\n`);
}

// 运行演示
runDemo().catch((error) => {
  console.error('演示出错:', error);
  process.exit(1);
});
