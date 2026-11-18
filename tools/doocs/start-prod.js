#!/usr/bin/env node

/**
 * Doocs 服务启动脚本 (生产级)
 * 启动代理服务、本地存储 API 和 Doocs CLI
 *
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const net = require('net');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const __dirname = path.dirname(__filename);

// ============================================================================
// 配置
// ============================================================================

const CONFIG = {
  SERVER: {
    HOST: '127.0.0.1',
    PORT: 8800,
    PROXY_PORT: 55885,
  },
  STORAGE: {
    ROOT: path.join(__dirname, 'local-storage'),
  },
};

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
};

/**
 * 检查端口是否被占用
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(err.code === 'EADDRINUSE');
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
 */
async function killProcessOnPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
    const lines = output.split('\n');
    if (lines.length > 0) {
      const parts = lines[0].trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== 'PID') {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        Logger.info(`已关闭占用端口 ${port} 的进程 (PID: ${pid})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 等待端口可用
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
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// ============================================================================
// 启动 Doocs CLI
// ============================================================================

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
      });

      // 等待 CLI 就绪
      await new Promise(resolve => {
        const timeout = setTimeout(() => resolve(isReady), 8000);
        cli.on('exit', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

      Logger.info(`✓ Doocs CLI 已启动 (端口: ${cliPort})`);
      return true;
    } catch (error) {
      Logger.error(`启动 Doocs CLI 失败:`, error.message);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return false;
}

// ============================================================================
// 主程序
// ============================================================================

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 启动 Doocs 服务 (生产环境)`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 显示配置
    console.log(`📋 配置信息:`);
    console.log(`  Proxy: http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}`);
    console.log(`  CLI: http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PORT}`);
    console.log(`  Storage: ${CONFIG.STORAGE.ROOT}\n`);

    // 检查文件
    const apiPath = path.join(__dirname, 'local-storage-api.prod.js');
    const adapterPath = path.join(__dirname, 'local-storage-adapter.prod.js');

    if (!fileExists(apiPath)) {
      throw new Error('本地存储 API 不存在');
    }
    if (!fileExists(adapterPath)) {
      throw new Error('存储适配器不存在');
    }

    Logger.info('✓ 本地存储 API 已就绪');

    // 清理端口
    const proxyPort = CONFIG.SERVER.PROXY_PORT;
    Logger.info(`检查端口 ${proxyPort}...`);
    
    const inUse = await isPortInUse(proxyPort);
    if (inUse) {
      Logger.warn(`端口 ${proxyPort} 已被占用，尝试释放...`);
      await killProcessOnPort(proxyPort);
    }

    Logger.info(`✓ 端口 ${proxyPort} 已就绪`);

    // 启动 CLI
    console.log('');
    const cliStarted = await startDoocsCli();

    if (!cliStarted) {
      Logger.warn('CLI 启动可能失败，但继续尝试...');
    }

    // 显示完成信息
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Doocs 已启动`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`🌐 访问地址:`);
    console.log(`   http://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PROXY_PORT}\n`);

    console.log(`💾 本地存储:`);
    console.log(`   API: /api/storage/documents`);
    console.log(`   状态: /api/storage/health\n`);

    console.log(`📚 功能说明:`);
    console.log(`   • 前端完整功能 (来自 https://md.doocs.org)`);
    console.log(`   • 文件存储在本地文件系统`);
    console.log(`   • 支持导入/导出\n`);

    console.log(`🛑 停止服务: Ctrl+C\n`);

    // 优雅关闭
    process.on('SIGINT', () => {
      console.log('\n正在关闭服务...');
      process.exit(0);
    });
  } catch (error) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`❌ 启动失败`);
    console.log(`${'='.repeat(60)}\n`);
    Logger.error('错误:', error.message);
    process.exit(1);
  }
}

// 执行
main().catch((error) => {
  Logger.error('未处理的错误:', error);
  process.exit(1);
});
