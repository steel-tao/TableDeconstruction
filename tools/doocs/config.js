/**
 * 本地存储配置
 * 环境变量、功能开关、常数定义
 *
 * @module config
 * @version 1.0.0
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEBUG = process.env.DEBUG === 'true' || NODE_ENV === 'development';

export const CONFIG = {
  // ====== 环境 ======
  NODE_ENV,
  DEBUG,
  VERSION: '1.0.0',

  // ====== 服务器配置 ======
  SERVER: {
    HOST: process.env.SERVER_HOST || '127.0.0.1',
    PORT: parseInt(process.env.SERVER_PORT) || 8800,
    PROXY_PORT: parseInt(process.env.PROXY_PORT) || 55885,
  },

  // ====== 存储配置 ======
  STORAGE: {
    ROOT: process.env.STORAGE_ROOT || './local-storage',
    MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_DOCUMENT_ID_LENGTH: 255,
    MAX_BATCH_SIZE: 100,
  },

  // ====== 代理配置 ======
  PROXY: {
    TARGET: process.env.PROXY_TARGET || 'https://md.doocs.org/',
    CHANGE_ORIGIN: true,
    TIMEOUT: 30000,
  },

  // ====== 功能开关 ======
  FEATURES: {
    LOCAL_STORAGE: true, // 启用本地存储
    AUTO_SYNC: true, // 启用自动同步
    COMPRESSION: false, // 启用压缩（预留）
    VERSIONING: false, // 启用版本控制（预留）
  },

  // ====== 日志配置 ======
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || (DEBUG ? 'debug' : 'info'),
    FORMAT: 'json', // 'json' 或 'text'
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  },

  // ====== 安全配置 ======
  SECURITY: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    RATE_LIMIT_WINDOW: 60000, // 1分钟
    RATE_LIMIT_MAX: 100, // 每分钟最多请求数
  },
};

// 验证配置
function validateConfig() {
  const errors = [];

  if (CONFIG.SERVER.PORT < 1 || CONFIG.SERVER.PORT > 65535) {
    errors.push('SERVER.PORT must be between 1 and 65535');
  }

  if (!CONFIG.STORAGE.ROOT) {
    errors.push('STORAGE.ROOT cannot be empty');
  }

  if (errors.length > 0) {
    console.error('❌ 配置验证失败:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

// 执行验证
validateConfig();

/**
 * 获取配置值
 * @param {string} key - 配置键（支持 dot notation，如 'SERVER.PORT'）
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
export function getConfig(key, defaultValue = undefined) {
  let value = CONFIG;
  for (const part of key.split('.')) {
    value = value?.[part];
  }
  return value !== undefined ? value : defaultValue;
}

export default CONFIG;
