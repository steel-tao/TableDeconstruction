#!/usr/bin/env node

/**
 * Doocs 服务启动脚本 (生产级)
 * 启动代理服务、本地存储 API 和 Doocs CLI
 *
 * @version 1.0.0
 */

import { spawn } from 'child_process';
import net from 'net';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// 工具函数
// ============================================================================

const Logger = {
  prefix: (level) => {
    const time = new Date().toLocaleTimeString('zh-CN');
    const icons = { info: '✓', warn: '⚠', error: '✗', debug: '→' };
    return `[${time}] ${icons[level] || '•'}`;
  },
  info: (msg, data = '') => console.log(`${Logger.prefix('info')} ${msg}`, data),
  warn: (msg, data = '') => console.warn(`${Logger.prefix('warn')} ${msg}`, data),
  error: (msg, data = '') => console.error(`${Logger.prefix('error')} ${msg}`, data),
  debug: (msg, data = '') => CONFIG.DEBUG && console.debug(`${Logger.prefix('debug')} ${msg}`, data),
  section: (title) => console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`),
};

/**
 * 检查端口是否被占用
 * @async
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * 杀死占用端口的进程
 * @async
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const pid = output.trim().split(/\s+/).pop();
      if (pid && pid !== 'PID') {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        Logger.info(`已关闭占用端口 ${port} 的进程 (PID: ${pid})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
    } else {
      const output = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
      if (output) {
        execSync(`kill -9 ${output}`, { stdio: 'ignore' });
        Logger.info(`已关闭占用端口 ${port} 的进程 (PID: ${output})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
    }
    return false;
  } catch (error) {
    // 端口未被占用
    return false;
  }
}

/**
 * 等待端口可用
 * @async
 * @param {number} port
 * @param {number} timeout
 * @returns {Promise<boolean>}
 */
async function waitForPort(port, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

/**
 * 检查文件是否存在
 * @param {string} filePath
 * @returns {boolean}
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// ============================================================================
// 服务启动函数
// ============================================================================

/**
 * 启动代理服务
 * @async
 * @returns {Promise<boolean>}
 */
async function startProxyServer() {
  const proxyPort = CONFIG.SERVER.PROXY_PORT;

  Logger.info(`启动代理服务 (端口: ${proxyPort})...`);

  // 检查端口
  const inUse = await isPortInUse(proxyPort);
  if (inUse) {
    Logger.warn(`端口 ${proxyPort} 已被占用，尝试释放...`);
    await killProcessOnPort(proxyPort);
  }

  try {
    // 使用内置 HTTP 服务启动代理
    const proxyScript = path.join(__dirname, 'proxy-server.cjs');
    if (!fileExists(proxyScript)) {
      throw new Error('代理脚本不存在');
    }

    const proxy = spawn('node', [proxyScript], {
      cwd: __dirname,
      stdio: 'pipe',
      detached: false,
      shell: true,
    });

    proxy.stdout?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) Logger.info(`[代理] ${msg}`);
    });

    proxy.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) Logger.warn(`[代理] ${msg}`);
    });

    proxy.on('error', (error) => {
      Logger.error('代理启动失败:', error.message);
    });

    // 等待代理就绪
    await waitForPort(proxyPort, 5000);
    Logger.info(`✓ 代理服务已启动 (端口: ${proxyPort})`);

    return true;
  } catch (error) {
    Logger.error('启动代理失败:', error.message);
    return false;
  }
}

/**
 * 检查本地存储 API
 * @returns {boolean}
 */
function checkLocalStorageAPI() {
  const apiPath = path.join(__dirname, 'local-storage-api.prod.js');
  const adapterPath = path.join(__dirname, 'local-storage-adapter.prod.js');

  if (!fileExists(apiPath)) {
    Logger.error('本地存储 API 不存在:', apiPath);
    return false;
  }

  if (!fileExists(adapterPath)) {
    Logger.error('存储适配器不存在:', adapterPath);
    return false;
  }

  Logger.info('✓ 本地存储 API 已就绪');
  return true;
}

/**
 * 启动 Doocs CLI
 * @async
 * @param {number} maxRetries
 * @returns {Promise<boolean>}
 */
async function startDoocsCli(maxRetries = 3) {
  const cliPort = CONFIG.SERVER.PORT;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      Logger.info(`启动 Doocs CLI (端口: ${cliPort})...`);

      const cli = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'node_modules/@doocs/md-cli'),
        stdio: 'pipe',
        shell: true,
      });

      let isReady = false;

      cli.stdout?.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('服务已启动') || msg.includes('listening')) {
          isReady = true;
        }
        if (!msg.includes('DeprecationWarning')) {
          process.stdout.write(`[CLI] ${msg}`);
        }
      });

      cli.stderr?.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes('DeprecationWarning') && !msg.includes('MODULE_TYPELESS')) {
          process.stderr.write(`[CLI] ${msg}`);
        }
      });

      cli.on('exit', (code) => {
        Logger.warn(`Doocs CLI 已退出 (代码: ${code})`);
        if (retries < maxRetries - 1) {
          Logger.info(`${5}秒后重启...`);
        }
      });

      cli.on('error', (error) => {
        Logger.error('CLI 启动失败:', error.message);
      });

      // 等待 CLI 就绪
      const ready = await new Promise(resolve => {
        const timeout = setTimeout(() => resolve(isReady), 8000);
        cli.on('exit', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

      if (!ready) {
        Logger.warn(`CLI 未在预期时间内就绪，重试...`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      Logger.info(`✓ Doocs CLI 已启动 (端口: ${cliPort})`);
      return true;
    } catch (error) {
      Logger.error(`启动 Doocs CLI 失败 (重试 ${retries + 1}/${maxRetries}):`, error.message);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return false;
}

// ============================================================================
// 主程序
// ============================================================================

async function main() {
  Logger.section('🚀 启动 Doocs 服务 (生产环境)');

  // 显示配置信息
  console.log(`\n📋 配置信息:`);
  console.log(`  NODE_ENV: ${CONFIG.NODE_ENV}`);
  console.log(`  DEBUG: ${CONFIG.DEBUG}`);
  console.log(`  Proxy: http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}`);
  console.log(`  CLI: http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PORT}`);
  console.log(`  Storage: ${CONFIG.STORAGE.ROOT}\n`);

  try {
    // 1. 检查存储
    Logger.info('检查本地存储 API...');
    if (!checkLocalStorageAPI()) {
      throw new Error('本地存储 API 检查失败');
    }

    // 2. 启动代理
    Logger.info('');
    if (!(await startProxyServer())) {
      throw new Error('代理启动失败');
    }

    // 3. 启动 Doocs CLI
    Logger.info('');
    if (!(await startDoocsCli())) {
      Logger.warn('Doocs CLI 启动失败（但代理可能仍在运行）');
    }

    // 4. 显示启动信息
    Logger.section('✅ Doocs 已启动');
    console.log(`
🌐 访问地址:
   http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}

💾 本地存储:
   前端 → IndexedDB 拦截 → 本地文件系统
   API: /api/storage/documents
   状态: /api/storage/health

📚 功能说明:
   • 前端完整功能 (来自 ${CONFIG.PROXY.TARGET})
   • 文件存储在本地文件系统
   • 自动重启机制
   • 支持导入/导出

⌨️  快捷命令:
   导出数据: curl http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}/api/storage/export
   导入数据: curl -X POST http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}/api/storage/import
   存储状态: curl http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}/api/storage/health

🛑 停止服务: Ctrl+C
    `);

    // 5. 优雅关闭处理
    process.on('SIGINT', () => {
      Logger.section('⏹️  关闭服务');
      Logger.info('正在关闭所有服务...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      Logger.section('⏹️  服务已终止');
      process.exit(0);
    });
  } catch (error) {
    Logger.section('❌ 启动失败');
    Logger.error('错误:', error.message);
    process.exit(1);
  }
}

// 执行主程序
main().catch((error) => {
  Logger.error('未处理的错误:', error);
  process.exit(1);
});
