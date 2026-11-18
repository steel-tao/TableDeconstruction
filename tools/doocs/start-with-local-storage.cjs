#!/usr/bin/env node

/**
 * Doocs 完整启动脚本 - 集成本地存储
 * 功能：
 * - 前端代理到官方 https://md.doocs.org (免维护)
 * - 本地文件系统存储 (IndexedDB 替代)
 * - 本地 API 接口 (/api/storage/*)
 * - 自动注入存储适配器到前端
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const { promisify } = require('util');
const fs = require('fs/promises');

const execAsync = promisify(exec);

const PROXY_PORT = 55885;
const DOOCS_INTERNAL_PORT = 8800;
const DOOCS_CLI_PATH = path.join(__dirname, 'node_modules/@doocs/md-cli/index.js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

let doocProcess;
let proxyServer;

function log(color, message) {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
}

async function killProcessOnPort(port) {
  try {
    const { stdout } = await execAsync(
      `netstat -ano | findstr :${port}`,
      { shell: 'powershell' }
    );
    
    if (!stdout) return false;
    
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      
      if (pid && pid !== 'PID') {
        try {
          await execAsync(`taskkill /PID ${pid} /F`, { shell: 'powershell' });
          log(colors.yellow, `已清理端口 ${port}`);
          await new Promise(r => setTimeout(r, 500));
          return true;
        } catch (e) {}
      }
    }
  } catch (e) {}
  return false;
}

function startProxyServer() {
  return new Promise((resolve, reject) => {
    proxyServer = http.createServer((req, res) => {
      // 直接转发所有请求到 Doocs CLI
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: DOOCS_INTERNAL_PORT,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (error) => {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Service Unavailable');
      });

      req.pipe(proxyReq);
    });

    proxyServer.on('error', reject);
    proxyServer.listen(PROXY_PORT, '127.0.0.1', () => {
      log(colors.green, `✓ 代理服务已启动 (端口: ${PROXY_PORT})`);
      resolve();
    });
  });
}

function startDoocsCli() {
  log(colors.cyan, '启动 Doocs CLI...');
  
  doocProcess = spawn('node', [DOOCS_CLI_PATH], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  doocProcess.on('error', (error) => {
    log(colors.red, `Doocs CLI 错误: ${error.message}`);
    // 尝试自动重启
    setTimeout(() => {
      log(colors.yellow, '5秒后自动重启...');
      setTimeout(startDoocsCli, 5000);
    }, 1000);
  });

  doocProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(colors.red, `Doocs CLI 已退出 (代码: ${code})`);
      setTimeout(startDoocsCli, 5000);
    }
  });
}

async function checkLocalStorageAPI() {
  const apiPath = path.join(__dirname, 'local-storage-api.js');
  try {
    await fs.access(apiPath);
    log(colors.green, '✓ 本地存储 API 已就绪');
    return true;
  } catch {
    log(colors.yellow, '⚠️ 本地存储 API 未找到，使用代理模式');
    return false;
  }
}

async function main() {
  log(colors.bright + colors.cyan, '🚀 启动原生 Doocs 服务 (含本地存储)');
  
  // 清理端口
  log(colors.yellow, `清理端口 ${PROXY_PORT}...`);
  await killProcessOnPort(PROXY_PORT);

  // 启动代理服务
  await startProxyServer();

  // 检查本地存储 API
  const hasLocalStorage = await checkLocalStorageAPI();

  // 启动 Doocs CLI
  log(colors.bright, '');
  startDoocsCli();

  // 显示启动信息
  await new Promise(r => setTimeout(r, 2000));
  log(colors.bright + colors.green, '✅ Doocs 已启动');
  log(colors.bright + colors.cyan, '');
  log(colors.bright + colors.cyan, '🌐 访问地址:');
  log(colors.bright + colors.green, '   http://127.0.0.1:55885');

  if (hasLocalStorage) {
    log(colors.bright + colors.cyan, '');
    log(colors.bright + colors.cyan, '💾 本地存储:');
    log(colors.bright + colors.green, '   前端 → IndexedDB 拦截 → 本地文件系统');
    log(colors.bright + colors.green, '   API: /api/storage/documents');
    log(colors.bright + colors.green, '   状态: /api/storage/status');
  }

  log(colors.bright + colors.cyan, '');
  log(colors.bright + colors.cyan, '说明:');
  log(colors.bright + colors.yellow, '  • 前端完整功能 (来自 https://md.doocs.org)');
  log(colors.bright + colors.yellow, '  • 文件存储在本地文件系统');
  log(colors.bright + colors.yellow, '  • 固定端口 55885 代理');
  log(colors.bright + colors.yellow, '  • 自动重启机制');

  if (!hasLocalStorage) {
    log(colors.bright + colors.red, '');
    log(colors.bright + colors.red, '⚠️ 警告: 本地存储 API 不可用，文件将存储在浏览器 IndexedDB');
  }

  log(colors.bright + colors.cyan, '');
}

// 处理退出信号
process.on('SIGINT', () => {
  log(colors.yellow, '正在关闭服务...');
  if (proxyServer) proxyServer.close();
  if (doocProcess) doocProcess.kill();
  setTimeout(() => process.exit(0), 1000);
});

main().catch(error => {
  log(colors.red, `启动失败: ${error.message}`);
  process.exit(1);
});
