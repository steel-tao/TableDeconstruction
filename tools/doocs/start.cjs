#!/usr/bin/env node

/**
 * Doocs 原生启动脚本 - 纯净版本
 * 功能：在固定端口 55885 部署原生 Doocs，不添加任何自定义功能
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PROXY_PORT = 55885;
const DOOCS_INTERNAL_PORT = 8800;  // Doocs CLI 实际运行在 8800
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
    stdio: 'pipe',
    shell: false,
  });

  doocProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) log(colors.cyan, `[Doocs] ${text}`);
  });

  doocProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text && !text.includes('DeprecationWarning')) {
      log(colors.yellow, `[Doocs] ${text}`);
    }
  });

  doocProcess.on('close', (code) => {
    log(colors.yellow, `Doocs 已退出，5秒后重启...`);
    setTimeout(startDoocsCli, 5000);
  });
}

async function main() {
  try {
    log(colors.bright + colors.green, '🚀 启动原生 Doocs 服务');
    log(colors.cyan, `清理端口 ${PROXY_PORT}...`);
    await killProcessOnPort(PROXY_PORT);

    log(colors.cyan, '启动代理服务...');
    await startProxyServer();

    log(colors.cyan, '');
    startDoocsCli();

    log(colors.green, '\n✅ Doocs 已启动\n');
    log(colors.bright, '🌐 访问地址:');
    log(colors.cyan, `  http://127.0.0.1:${PROXY_PORT}\n`);
    log(colors.bright, '说明:');
    log(colors.cyan, '  • 完整的原生 Doocs 功能');
    log(colors.cyan, '  • 固定端口 55885');
    log(colors.cyan, '  • 自动重启机制\n');

    const shutdown = () => {
      log(colors.yellow, '\n🛑 关闭服务...');
      if (doocProcess) {
        try {
          process.kill(-doocProcess.pid);
        } catch (e) {}
      }
      if (proxyServer) {
        proxyServer.close();
      }
      setTimeout(() => {
        log(colors.green, '✓ 已关闭');
        process.exit(0);
      }, 500);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    log(colors.red, `启动失败: ${error.message}`);
    process.exit(1);
  }
}

main();
