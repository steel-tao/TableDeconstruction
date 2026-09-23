/**
 * @file scripts/setup.js
 * @description 项目初始化脚本
 */

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

console.log(`${BLUE}🚀 初始化微信公众号内容管理系统${RESET}\n`);

// 1. 创建必要的目录
console.log(`${YELLOW}📁 创建项目目录结构...${RESET}`);
const dirs = [
  'data',
  'logs',
  'output',
  'obsidian-vault/content',
  'obsidian-vault/attachments',
  'obsidian-vault/templates',
];

dirs.forEach((dir) => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✓ 创建目录: ${dir}`);
  }
});

// 2. 复制环境配置
console.log(`\n${YELLOW}⚙️  设置环境配置...${RESET}`);
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envLocalPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envExamplePath) && !fs.existsSync(envLocalPath)) {
  fs.copyFileSync(envExamplePath, envLocalPath);
  console.log(`  ✓ 已创建 .env.local (基于 .env.example)`);
  console.log(`  ℹ️  请编辑 .env.local 配置你的微信账号信息`);
} else if (fs.existsSync(envLocalPath)) {
  console.log(`  ℹ️  .env.local 已存在，跳过初始化`);
}

// 3. 初始化数据库
console.log(`\n${YELLOW}🗄️  初始化数据库...${RESET}`);
console.log(`  ℹ️  数据库将在首次运行时自动创建`);

// 4. 显示后续步骤
console.log(`\n${GREEN}✅ 初始化完成！${RESET}\n`);
console.log(`${BLUE}后续步骤:${RESET}`);
console.log(`  1. 编辑 .env.local，配置微信账号信息`);
console.log(`  2. 运行 npm install 安装依赖`);
console.log(`  3. 运行 npm run dev 启动开发服务`);
console.log(`  4. 查看文档: cat docs/04-user-guide/GETTING_STARTED.md\n`);
