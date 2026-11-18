#!/usr/bin/env node

/**
 * @file scripts/test-wechat-api.cjs
 * @description WeChat API 验证脚本 - 一键测试真实 API 是否可用
 * 
 * 使用方法：
 * 1. 配置 .env 文件：
 *    WECHAT_APP_ID=your_app_id
 *    WECHAT_APP_SECRET=your_app_secret
 * 
 * 2. 运行脚本：
 *    npm run test:wechat-api
 * 
 * 3. 查看结果：
 *    ✅ 所有测试通过 -> API 可用，可以切换到 WECHAT_ADAPTER=real
 *    ❌ 某个测试失败 -> 检查 AppID/Secret 或权限
 */

const https = require('https');
const http = require('http');
require('dotenv').config();

// ============================================================================
// 配置
// ============================================================================

const config = {
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
  apiBase: 'https://api.weixin.qq.com',
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// ============================================================================
// 工具函数
// ============================================================================

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function logTest(name, passed, message = '') {
  const icon = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  console.log(`${icon} [${status}] ${name}`);
  if (message) {
    console.log(`  ${colors.yellow}${message}${colors.reset}`);
  }
}

/**
 * 发起 HTTPS 请求
 */
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, options, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Failed to parse response', raw: data });
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 验证配置
 */
async function validateConfig() {
  logSection('Step 1: 配置检查');

  if (!config.appId) {
    logTest('检查 WECHAT_APP_ID', false, '环境变量未设置');
    return false;
  }

  if (!config.appSecret) {
    logTest('检查 WECHAT_APP_SECRET', false, '环境变量未设置');
    return false;
  }

  logTest('检查 WECHAT_APP_ID', true, `${config.appId.substring(0, 10)}...`);
  logTest('检查 WECHAT_APP_SECRET', true, `${config.appSecret.substring(0, 10)}...`);

  return true;
}

/**
 * 测试网络连接
 */
async function testNetworkConnection() {
  logSection('Step 2: 网络连接测试');

  try {
    const response = await httpsRequest(`${config.apiBase}/cgi-bin/ticket/getjsapiticket`);
    logTest('能否访问 WeChat API 服务器', !response.error, response.error || 'API 服务器响应正常');
    return !response.error;
  } catch (error) {
    logTest('能否访问 WeChat API 服务器', false, `${error.message}`);
    return false;
  }
}

/**
 * 测试 Access Token 获取
 */
async function testAccessToken() {
  logSection('Step 3: Access Token 获取测试');

  try {
    const url = `${config.apiBase}/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
    const response = await httpsRequest(url);

    if (response.errcode) {
      logTest('获取 Access Token', false, `错误: ${response.errmsg}`);
      return { success: false, token: null, error: response.errmsg };
    }

    if (!response.access_token) {
      logTest('获取 Access Token', false, '响应中没有 access_token');
      return { success: false, token: null };
    }

    logTest('获取 Access Token', true, `Token 长度: ${response.access_token.length} 字符`);
    logTest('Token 有效期', true, `${Math.floor(response.expires_in / 60)} 分钟`);

    return { success: true, token: response.access_token };
  } catch (error) {
    logTest('获取 Access Token', false, `${error.message}`);
    return { success: false, token: null, error: error.message };
  }
}

/**
 * 测试草稿保存功能
 */
async function testSaveDraft(token) {
  logSection('Step 4: 保存草稿功能测试');

  try {
    const payload = {
      articles: [
        {
          title: '测试文章',
          author: 'API Test',
          digest: '这是一个测试文章',
          show_cover_pic: 0,
          content: '<p>这是测试内容</p>',
          content_source_url: '',
        },
      ],
    };

    const url = `${config.apiBase}/cgi-bin/draft/add?access_token=${token}`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ error: 'Failed to parse response', raw: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(JSON.stringify(payload));
      req.end();
    });

    if (response.errcode) {
      logTest('保存草稿 API', false, `错误: ${response.errmsg}`);
      return false;
    }

    if (!response.media_id) {
      logTest('保存草稿 API', false, '响应中没有 media_id');
      return false;
    }

    logTest('保存草稿 API', true, `Media ID: ${response.media_id}`);
    return true;
  } catch (error) {
    logTest('保存草稿 API', false, `${error.message}`);
    return false;
  }
}

/**
 * 测试发布功能
 */
async function testPublish(token) {
  logSection('Step 5: 发布功能测试');

  try {
    // 先保存草稿
    const payload = {
      articles: [
        {
          title: '发布测试文章',
          author: 'API Test',
          digest: '这是一个发布测试文章',
          show_cover_pic: 0,
          content: '<p>这是发布测试内容</p>',
          content_source_url: '',
        },
      ],
    };

    const draftUrl = `${config.apiBase}/cgi-bin/draft/add?access_token=${token}`;
    const draftResponse = await new Promise((resolve, reject) => {
      const req = https.request(draftUrl, { method: 'POST' }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({});
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });

    if (!draftResponse.media_id) {
      logTest('发布 API', false, '无法创建草稿作为测试');
      return false;
    }

    // 再尝试发布
    const publishPayload = {
      media_ids: [draftResponse.media_id],
      publish_time: 0,
    };

    const publishUrl = `${config.apiBase}/cgi-bin/freepublish/submit?access_token=${token}`;
    const publishResponse = await new Promise((resolve, reject) => {
      const req = https.request(publishUrl, { method: 'POST' }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({});
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(publishPayload));
      req.end();
    });

    if (publishResponse.errcode) {
      // 检查是否是权限问题
      if (publishResponse.errmsg && publishResponse.errmsg.includes('permission')) {
        logTest('发布 API（免审）', false, `权限不足: ${publishResponse.errmsg}（可能需要申请"免审"权限或使用标准审核流程）`);
      } else {
        logTest('发布 API（免审）', false, `错误: ${publishResponse.errmsg}`);
      }
      return false;
    }

    if (!publishResponse.msg_id) {
      logTest('发布 API（免审）', false, '响应中没有 msg_id');
      return false;
    }

    logTest('发布 API（免审）', true, `Message ID: ${publishResponse.msg_id}`);
    return true;
  } catch (error) {
    logTest('发布 API（免审）', false, `${error.message}`);
    return false;
  }
}

/**
 * 生成报告
 */
function generateReport(results) {
  logSection('测试结果总结');

  const passed = Object.values(results).filter((r) => r).length;
  const total = Object.keys(results).length;
  const percentage = Math.floor((passed / total) * 100);

  console.log(`${colors.bold}总体通过率: ${percentage}% (${passed}/${total})${colors.reset}\n`);

  if (percentage === 100) {
    log(colors.green, `${colors.bold}✓ 所有测试通过！${colors.reset}`);
    console.log(`\n建议操作：`);
    console.log(`1. 在 .env 中配置：WECHAT_ADAPTER=real`);
    console.log(`2. 重启应用即可使用真实 WeChat API\n`);
  } else if (percentage >= 75) {
    log(colors.yellow, `${colors.bold}⚠ 大部分测试通过，可能存在权限问题${colors.reset}`);
    console.log(`\n建议操作：`);
    console.log(`1. 检查微信账号的 API 权限配置`);
    console.log(`2. 某些高级功能可能需要单独申请权限\n`);
  } else {
    log(colors.red, `${colors.bold}✗ 测试失败，请检查配置${colors.reset}`);
    console.log(`\n常见问题：`);
    console.log(`1. AppID 或 AppSecret 错误`);
    console.log(`2. 网络连接问题`);
    console.log(`3. 微信账号未激活或被限制\n`);
  }
}

// ============================================================================
// 主流程
// ============================================================================

async function main() {
  logSection('微信 API 验证脚本');
  console.log(`${colors.cyan}此脚本将验证你的 WeChat API 配置是否正确${colors.reset}\n`);

  const results = {
    config: false,
    network: false,
    token: false,
    draft: false,
    publish: false,
  };

  try {
    // Step 1: 配置检查
    if (!(await validateConfig())) {
      generateReport(results);
      process.exit(1);
    }
    results.config = true;

    // Step 2: 网络测试
    if (!(await testNetworkConnection())) {
      generateReport(results);
      process.exit(1);
    }
    results.network = true;

    // Step 3: Access Token 测试
    const tokenResult = await testAccessToken();
    if (!tokenResult.success) {
      generateReport(results);
      process.exit(1);
    }
    results.token = true;

    // Step 4: 草稿保存测试
    results.draft = await testSaveDraft(tokenResult.token);

    // Step 5: 发布测试
    if (results.draft) {
      results.publish = await testPublish(tokenResult.token);
    }

    generateReport(results);
  } catch (error) {
    log(colors.red, `\n✗ 发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 运行
main();
