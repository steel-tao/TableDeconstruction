/**
 * @file src/config/index.ts
 * @description 项目配置管理
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载.env文件
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const Config = {
  // 环境
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // 服务器
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
  },

  // 微信配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    token: process.env.WECHAT_TOKEN,
    encodingAesKey: process.env.WECHAT_ENCODING_AES_KEY,
  },

  // Obsidian配置
  obsidian: {
    vaultPath: process.env.OBSIDIAN_VAULT_PATH || '',
    contentFolder: process.env.OBSIDIAN_CONTENT_FOLDER || 'content',
  },

  // 数据库
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || './data/app.db',
  },

  // 日志
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // 排版
  render: {
    theme: process.env.RENDER_THEME || 'default',
    responsive: process.env.RENDER_RESPONSIVE !== 'false',
  },
};

export default Config;
