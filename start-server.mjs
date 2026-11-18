#!/usr/bin/env node

/**
 * @file start-server.mjs
 * @description 启动完整服务器
 * 
 * 使用方法:
 *   node --experimental-specifier-resolution=node start-server.mjs
 *   PORT=3001 npm run start:server
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

// ESM 兼容性处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入服务器
const { startServer } = await import('./dist/server.js');

// 配置
const config = {
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '127.0.0.1',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'db.sqlite'),
  env: process.env.NODE_ENV || 'production',
  wechatMode: process.env.WECHAT_ADAPTER || 'real',
  corsOrigin: process.env.CORS_ORIGIN || 'http://127.0.0.1:3000',
};

console.log('📋 服务器配置:', config);

// 启动服务器
startServer(config).catch((error) => {
  console.error('❌ 启动失败:', error);
  process.exit(1);
});
