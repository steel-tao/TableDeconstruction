#!/usr/bin/env node

/**
 * 统一启动脚本 - 启动所有服务
 * 
 * 服务列表：
 * 1. 文件管理器 (http://127.0.0.1:3000)
 * 2. Doocs 编辑器 (http://127.0.0.1:55885)
 * 
 * 使用方式：
 *   node scripts/start-all-services.js [--port-offset 0]
 */

const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 配置
const CONFIG = {
  fileManager: {
    name: '📁 文件管理器',
    port: 3000,
    cwd: path.join(__dirname, '../tools/file-manager'),
    cmd: 'node',
    args: ['server.js'],
  },
  doocs: {
    name: '📝 Doocs 编辑器',
    port: 55885,
    cwd: path.join(__dirname, '../tools/doocs'),
    cmd: 'node',
    args: ['server.js'],
  },
};

// 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

function logService(serviceName, message) {
  console.log(`${colors.cyan}[${serviceName}]${colors.reset} ${message}`);
}

/**
 * 检查端口是否被占用
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * 使用 netstat 杀死占用端口的进程 (Windows)
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
          log(colors.yellow, `  ⚠️  已杀死占用端口 ${port} 的进程 (PID: ${pid})`);
          await new Promise(r => setTimeout(r, 500));
          return true;
        } catch (e) {
          // 进程可能已经退出
        }
      }
    }
  } catch (e) {
    // netstat 命令失败，继续尝试
  }
  
  return false;
}

/**
 * 等待端口可用
 */
async function waitForPort(port, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const available = await checkPort(port);
    if (available) {
      return true;
    }
    
    if (i === 0) {
      log(colors.yellow, `  ⚠️  端口 ${port} 被占用，尝试清理...`);
      await killProcessOnPort(port);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  return false;
}

/**
 * 启动单个服务
 */
function startService(name, config) {
  return new Promise((resolve, reject) => {
    logService(name, `启动中... (端口: ${config.port})`);
    
    const child = spawn(config.cmd, config.args, {
      cwd: config.cwd,
      stdio: 'pipe',
      shell: true,
    });

    let started = false;
    let output = '';

    const timeout = setTimeout(() => {
      if (!started) {
        log(colors.red, `✗ ${name} 启动超时`);
        child.kill();
        reject(new Error(`${name} 启动超时`));
      }
    }, 10000);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`  ${colors.cyan}${text}${colors.reset}`);
      
      // 检查启动成功的标志
      if (
        text.includes('已启动') ||
        text.includes('Listening') ||
        text.includes('running')
      ) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          logService(name, `${colors.green}✓ 启动成功${colors.reset}`);
          resolve(child);
        }
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      // 忽略一些无害的警告
      if (!text.includes('DEP0060') && !text.includes('DeprecationWarning')) {
        process.stderr.write(`  ${colors.red}${text}${colors.reset}`);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on('close', (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`${name} 退出 (代码: ${code})`));
      } else {
        logService(name, `${colors.yellow}⚠️  意外退出 (代码: ${code})${colors.reset}`);
      }
    });
  });
}

/**
 * 主启动函数
 */
async function main() {
  log(colors.bright + colors.green, '\n🚀 启动 Obsidian-Doocs 集成系统\n');

  const services = {};
  
  try {
    // 1. 检查并清理端口
    log(colors.blue, '📋 步骤 1: 检查端口可用性...\n');
    
    for (const [key, config] of Object.entries(CONFIG)) {
      const available = await checkPort(config.port);
      if (!available) {
        logService(config.name, `端口 ${config.port} 被占用，尝试清理...`);
        const killed = await killProcessOnPort(config.port);
        
        // 再次检查
        const nowAvailable = await waitForPort(config.port);
        if (nowAvailable) {
          logService(config.name, `${colors.green}✓ 端口已清理${colors.reset}`);
        } else {
          throw new Error(`无法清理端口 ${config.port}`);
        }
      } else {
        logService(config.name, `${colors.green}✓ 端口 ${config.port} 可用${colors.reset}`);
      }
    }

    // 2. 启动所有服务
    log(colors.blue, '\n📋 步骤 2: 启动服务...\n');

    const startPromises = [];
    
    for (const [key, config] of Object.entries(CONFIG)) {
      startPromises.push(
        startService(config.name, config).then(child => {
          services[key] = child;
        })
      );
    }

    await Promise.all(startPromises);

    // 3. 验证所有服务
    log(colors.blue, '\n📋 步骤 3: 验证服务...\n');
    
    for (const [key, config] of Object.entries(CONFIG)) {
      const available = await checkPort(config.port);
      if (available) {
        logService(config.name, `${colors.green}✓ 已验证${colors.reset}`);
      } else {
        logService(config.name, `❌ 验证失败`);
      }
    }

    // 4. 显示启动信息
    log(colors.green, '\n✅ 所有服务已启动\n');
    log(colors.bright, '访问地址:');
    log(colors.cyan, '  📁 文件管理器: http://127.0.0.1:3000');
    log(colors.cyan, '  📝 Doocs 编辑器: http://127.0.0.1:55885');
    log(colors.bright, '\n功能:');
    log(colors.cyan, '  1. 在文件管理器中选择 Obsidian 文件');
    log(colors.cyan, '  2. 点击 "🚀 打开到 Doocs" 按钮');
    log(colors.cyan, '  3. Doocs 会自动填充文件内容');
    log(colors.cyan, '  4. 点击 Copy 按钮复制到微信\n');

    log(colors.yellow, '按 Ctrl+C 停止所有服务\n');

    // 5. 处理退出信号
    const shutdown = () => {
      log(colors.yellow, '\n\n🛑 关闭所有服务...\n');
      
      for (const [key, child] of Object.entries(services)) {
        try {
          child.kill();
        } catch (e) {
          // 忽略错误
        }
      }
      
      setTimeout(() => {
        log(colors.green, '✓ 已关闭所有服务');
        process.exit(0);
      }, 1000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    log(colors.red, `\n❌ 启动失败: ${error.message}\n`);
    
    // 清理已启动的服务
    for (const [key, child] of Object.entries(services)) {
      try {
        child.kill();
      } catch (e) {
        // 忽略错误
      }
    }
    
    process.exit(1);
  }
}

main();
