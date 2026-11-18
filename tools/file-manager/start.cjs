#!/usr/bin/env node

/**
 * 文件管理器启动脚本 - 稳定版本
 * 
 * 功能：
 * 1. 在固定端口（3000）启动服务
 * 2. 自动清理占用的端口
 * 3. 保持进程运行
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = 3000;
const SERVER_FILE = path.join(__dirname, 'server.js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

let serverProcess;

function log(color, message) {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
}

/**
 * 杀死占用端口的进程
 */
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
          log(colors.yellow, `已清理端口 ${port} (PID: ${pid})`);
          await new Promise(r => setTimeout(r, 500));
          return true;
        } catch (e) {
          // 忽略
        }
      }
    }
  } catch (e) {
    // 忽略
  }
  return false;
}

/**
 * 主启动函数
 */
async function main() {
  try {
    log(colors.bright + colors.green, '🚀 启动文件管理器');
    
    // 清理端口
    log(colors.cyan, `检查端口 ${PORT}...`);
    await killProcessOnPort(PORT);

    // 启动服务器
    log(colors.cyan, '启动服务器...');
    
    serverProcess = spawn('node', [SERVER_FILE], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      cwd: __dirname,
    });

    let started = false;

    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(`  ${colors.cyan}${text}${colors.reset}`);
      
      if (!started && (text.includes('Vault 路径') || text.includes('访问地址'))) {
        started = true;
        log(colors.green, '✓ 服务器启动成功');
        log(colors.bright, '\n访问地址:');
        log(colors.cyan, `  📁 http://127.0.0.1:${PORT}\n`);
        log(colors.yellow, '按 Ctrl+C 停止服务\n');
      }
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`  ${colors.red}${data}${colors.reset}`);
    });

    serverProcess.on('error', (err) => {
      log(colors.red, `启动失败: ${err.message}`);
      process.exit(1);
    });

    serverProcess.on('close', (code) => {
      if (code !== 0) {
        log(colors.yellow, `服务器退出 (代码: ${code})`);
      }
    });

    // 处理退出信号
    const shutdown = () => {
      log(colors.yellow, '\n🛑 关闭文件管理器...\n');
      
      if (serverProcess) {
        serverProcess.kill();
      }
      
      setTimeout(() => {
        log(colors.green, '✓ 已关闭');
        process.exit(0);
      }, 500);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    log(colors.red, `启动失败: ${error.message}\n`);
    process.exit(1);
  }
}

main();
