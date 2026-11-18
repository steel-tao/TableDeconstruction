#!/usr/bin/env node

/**
 * @file scripts/test-publish-api.cjs
 * @description 测试发布 API 的完整工作流
 * 
 * 使用方法:
 *   npm run start:api          # 启动服务器
 *   npm run test:publish-api   # 在另一个终端运行测试
 */

const axios = require('axios');
const chalk = require('chalk');

// ============================================================================
// 配置
// ============================================================================

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

// ============================================================================
// 工具函数
// ============================================================================

const colors = {
  success: chalk.green,
  error: chalk.red,
  info: chalk.cyan,
  warn: chalk.yellow,
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequest(method, endpoint, data = null) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = { method, url, timeout: TEST_TIMEOUT };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: error.response?.data,
      status: error.response?.status,
    };
  }
}

// ============================================================================
// 测试
// ============================================================================

async function runTests() {
  console.log('\n' + colors.info('═══════════════════════════════════════════════'));
  console.log(colors.info('  📡 发布 API 工作流测试'));
  console.log(colors.info('═══════════════════════════════════════════════\n'));

  let passCount = 0;
  let failCount = 0;
  let recordId = '';

  // ========================================================================
  // 1. 健康检查
  // ========================================================================

  console.log(colors.info('\n1️⃣  健康检查'));
  console.log('───────────────────────────────────────────────\n');

  const healthCheck = await apiRequest('GET', '/health');
  if (healthCheck.success) {
    console.log(colors.success('✓ 服务器健康检查通过'));
    console.log(colors.info(`  状态: ${healthCheck.data.status}`));
    console.log(colors.info(`  环境: ${healthCheck.data.environment}`));
    passCount++;
  } else {
    console.log(colors.error(`✗ 服务器健康检查失败: ${healthCheck.error}`));
    console.log(colors.warn('  请先启动服务器: npm run start:api'));
    failCount++;
    return;
  }

  // ========================================================================
  // 2. 创建发布记录
  // ========================================================================

  console.log(colors.info('\n2️⃣  创建发布记录'));
  console.log('───────────────────────────────────────────────\n');

  const createResult = await apiRequest('POST', '/api/publish/records', {
    title: '测试文章：如何构建高效的内容管理系统',
    content: '<h1>测试文章</h1><p>这是一篇用于测试 API 的示例文章。</p>',
    creator: 'test_user',
    filePath: '/test/article.md',
  });

  if (createResult.success && createResult.data.data) {
    recordId = createResult.data.data.id;
    console.log(colors.success('✓ 发布记录创建成功'));
    console.log(colors.info(`  记录 ID: ${recordId}`));
    console.log(colors.info(`  标题: ${createResult.data.data.title}`));
    console.log(colors.info(`  状态: ${createResult.data.data.status}`));
    passCount++;
  } else {
    console.log(colors.error(`✗ 创建失败: ${createResult.error}`));
    failCount++;
  }

  if (!recordId) {
    console.log(colors.error('\n❌ 无法继续测试，记录创建失败'));
    return;
  }

  // ========================================================================
  // 3. 获取发布记录
  // ========================================================================

  console.log(colors.info('\n3️⃣  获取发布记录'));
  console.log('───────────────────────────────────────────────\n');

  const getResult = await apiRequest('GET', `/api/publish/records/${recordId}`);

  if (getResult.success && getResult.data.data) {
    console.log(colors.success('✓ 获取发布记录成功'));
    console.log(colors.info(`  ID: ${getResult.data.data.id}`));
    console.log(colors.info(`  标题: ${getResult.data.data.title}`));
    console.log(colors.info(`  创建人: ${getResult.data.data.creator}`));
    passCount++;
  } else {
    console.log(colors.error(`✗ 获取失败: ${getResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 4. 提交审核
  // ========================================================================

  console.log(colors.info('\n4️⃣  提交审核'));
  console.log('───────────────────────────────────────────────\n');

  const submitResult = await apiRequest('POST', `/api/publish/${recordId}/submit`, {
    htmlContent: '<h1>测试文章：如何构建高效的内容管理系统</h1><p>这是一篇用于测试 API 的示例文章。</p>',
  });

  if (submitResult.success && submitResult.data.data) {
    console.log(colors.success('✓ 提交审核成功'));
    console.log(colors.info(`  新状态: ${submitResult.data.data.status}`));
    passCount++;
  } else {
    console.log(colors.error(`✗ 提交审核失败: ${submitResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 5. 批准发布
  // ========================================================================

  console.log(colors.info('\n5️⃣  批准发布'));
  console.log('───────────────────────────────────────────────\n');

  const approveResult = await apiRequest('POST', `/api/publish/${recordId}/approve`, {
    reviewer: 'editor_alice',
    comment: '文章质量很好，已审核通过。',
  });

  if (approveResult.success && approveResult.data.data) {
    console.log(colors.success('✓ 批准发布成功'));
    console.log(colors.info(`  新状态: ${approveResult.data.data.status}`));
    console.log(colors.info(`  审核人: ${approveResult.data.data.reviewer}`));
    console.log(colors.info(`  审核意见: ${approveResult.data.data.reviewComment}`));
    passCount++;
  } else {
    console.log(colors.error(`✗ 批准发布失败: ${approveResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 6. 执行发布（使用 Mock 模式）
  // ========================================================================

  console.log(colors.info('\n6️⃣  执行发布'));
  console.log('───────────────────────────────────────────────\n');

  const executeResult = await apiRequest('POST', `/api/publish/${recordId}/execute`, {});

  if (executeResult.success && executeResult.data.data) {
    console.log(colors.success('✓ 执行发布成功'));
    console.log(colors.info(`  新状态: ${executeResult.data.data.status}`));
    console.log(colors.info(`  微信 ID: ${executeResult.data.data.wechatMsgId || 'N/A'}`));
    passCount++;
  } else {
    console.log(colors.error(`✗ 执行发布失败: ${executeResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 7. 列出所有记录
  // ========================================================================

  console.log(colors.info('\n7️⃣  列出发布记录'));
  console.log('───────────────────────────────────────────────\n');

  const listResult = await apiRequest('GET', '/api/publish/records?limit=10');

  if (listResult.success && Array.isArray(listResult.data.data)) {
    console.log(colors.success('✓ 列出记录成功'));
    console.log(colors.info(`  总数: ${listResult.data.data.length}`));
    listResult.data.data.forEach((record, index) => {
      console.log(colors.info(
        `  ${index + 1}. ${record.title} [${record.status}]`
      ));
    });
    passCount++;
  } else {
    console.log(colors.error(`✗ 列出记录失败: ${listResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 8. 获取统计信息
  // ========================================================================

  console.log(colors.info('\n8️⃣  获取统计信息'));
  console.log('───────────────────────────────────────────────\n');

  const statsResult = await apiRequest('GET', '/api/publish/stats');

  if (statsResult.success && statsResult.data.data) {
    console.log(colors.success('✓ 获取统计成功'));
    Object.entries(statsResult.data.data).forEach(([status, count]) => {
      console.log(colors.info(`  ${status}: ${count}`));
    });
    passCount++;
  } else {
    console.log(colors.error(`✗ 获取统计失败: ${statsResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 9. 获取审计日志
  // ========================================================================

  console.log(colors.info('\n9️⃣  获取审计日志'));
  console.log('───────────────────────────────────────────────\n');

  const logsResult = await apiRequest('GET', `/api/publish/${recordId}/logs`);

  if (logsResult.success && Array.isArray(logsResult.data.data)) {
    console.log(colors.success('✓ 获取审计日志成功'));
    console.log(colors.info(`  日志条数: ${logsResult.data.data.length}`));
    logsResult.data.data.slice(0, 3).forEach((log) => {
      console.log(colors.info(
        `  - ${log.action} (${log.timestamp})`
      ));
    });
    passCount++;
  } else {
    console.log(colors.error(`✗ 获取审计日志失败: ${logsResult.error}`));
    failCount++;
  }

  // ========================================================================
  // 结果总结
  // ========================================================================

  const totalTests = passCount + failCount;
  const passPercentage = Math.round((passCount / totalTests) * 100);

  console.log('\n' + colors.info('═══════════════════════════════════════════════'));
  console.log(colors.info('  📊 测试结果总结'));
  console.log(colors.info('═══════════════════════════════════════════════\n'));

  if (passCount === totalTests) {
    console.log(colors.success(`✅ 所有测试通过！ (${passCount}/${totalTests})\n`));
  } else {
    console.log(colors.warn(`⚠️  部分测试失败\n`));
    console.log(colors.success(`✓ 通过: ${passCount}/${totalTests}`));
    console.log(colors.error(`✗ 失败: ${failCount}/${totalTests}`));
    console.log(colors.warn(`📊 通过率: ${passPercentage}%\n`));
  }

  console.log(colors.info('═══════════════════════════════════════════════\n'));

  process.exit(passCount === totalTests ? 0 : 1);
}

// ============================================================================
// 启动测试
// ============================================================================

console.log(colors.info('⏳ 等待服务器启动...'));
delay(2000).then(() => runTests()).catch((error) => {
  console.error(colors.error('测试失败:'), error);
  process.exit(1);
});
