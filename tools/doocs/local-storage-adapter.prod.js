/**
 * 本地存储适配器 - 生产级实现
 * IndexedDB 拦截器，将所有数据操作转发到后端 API
 *
 * @module local-storage-adapter
 * @version 1.0.0
 */

(function() {
  'use strict';

  // =========================================================================
  // 配置
  // =========================================================================

  const CONFIG = {
    API_BASE: '/api/storage',
    TIMEOUT: 30000, // 30秒
    RETRY_MAX: 3,
    RETRY_DELAY: 1000, // 毫秒
    DEBUG: false,
  };

  // =========================================================================
  // 日志记录
  // =========================================================================

  const Logger = {
    prefix: '[LocalStorage]',
    info: (msg, data) => {
      console.log(`${Logger.prefix} ${msg}`, data || '');
    },
    warn: (msg, data) => {
      console.warn(`${Logger.prefix} ${msg}`, data || '');
    },
    error: (msg, data) => {
      console.error(`${Logger.prefix} ${msg}`, data || '');
    },
    debug: (msg, data) => {
      CONFIG.DEBUG && console.debug(`${Logger.prefix} [DEBUG] ${msg}`, data || '');
    },
  };

  // =========================================================================
  // 错误类定义
  // =========================================================================

  class AdapterError extends Error {
    constructor(message, code = 'ADAPTER_ERROR', details = {}) {
      super(message);
      this.name = 'AdapterError';
      this.code = code;
      this.details = details;
    }
  }

  class NetworkError extends AdapterError {
    constructor(message, details) {
      super(message, 'NETWORK_ERROR', details);
    }
  }

  class ValidationError extends AdapterError {
    constructor(message, details) {
      super(message, 'VALIDATION_ERROR', details);
    }
  }

  // =========================================================================
  // 网络请求
  // =========================================================================

  const HTTP = {
    /**
     * 发送 HTTP 请求
     * @async
     * @param {string} method
     * @param {string} path
     * @param {object} body
     * @returns {Promise<object>}
     */
    async request(method, path, body = null) {
      let retries = 0;
      const maxRetries = CONFIG.RETRY_MAX;

      while (retries < maxRetries) {
        try {
          const options = {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
          };

          if (body) {
            options.body = JSON.stringify(body);
          }

          Logger.debug(`${method} ${path}`);

          const response = await Promise.race([
            fetch(path, options),
            new Promise((_, reject) =>
              setTimeout(() => reject(new NetworkError('Request timeout')), CONFIG.TIMEOUT)
            ),
          ]);

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new NetworkError(
              error.error || `HTTP ${response.status}`,
              { status: response.status, response: error }
            );
          }

          const data = await response.json();

          if (!data.success) {
            throw new NetworkError(
              data.error || 'API returned success=false',
              { code: data.code, response: data }
            );
          }

          return data.data;
        } catch (error) {
          retries++;

          if (error instanceof NetworkError || error instanceof TypeError) {
            if (retries < maxRetries) {
              Logger.warn(`请求失败，重试 ${retries}/${maxRetries}:`, error.message);
              await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
              continue;
            }
          }

          throw error;
        }
      }
    },

    /**
     * GET 请求
     */
    async get(path) {
      return HTTP.request('GET', path);
    },

    /**
     * POST 请求
     */
    async post(path, body) {
      return HTTP.request('POST', path, body);
    },

    /**
     * DELETE 请求
     */
    async delete(path) {
      return HTTP.request('DELETE', path);
    },
  };

  // =========================================================================
  // 存储管理
  // =========================================================================

  const StorageManager = {
    // 缓存所有文档
    cache: new Map(),
    isInitialized: false,

    /**
     * 初始化存储（加载所有文档到缓存）
     * @async
     */
    async initialize() {
      if (StorageManager.isInitialized) {
        return;
      }

      try {
        Logger.info('初始化本地存储...');
        const docs = await HTTP.get(`${CONFIG.API_BASE}/documents?pageSize=1000`);

        if (Array.isArray(docs)) {
          docs.forEach(doc => {
            StorageManager.cache.set(doc.id, doc);
          });
        }

        StorageManager.isInitialized = true;
        Logger.info(`✅ 本地存储已初始化，加载了 ${StorageManager.cache.size} 个文档`);
      } catch (error) {
        Logger.error('初始化失败:', error.message);
        throw error;
      }
    },

    /**
     * 获取所有文档
     * @async
     * @returns {Promise<array>}
     */
    async getAll() {
      if (!StorageManager.isInitialized) {
        await StorageManager.initialize();
      }
      return Array.from(StorageManager.cache.values());
    },

    /**
     * 获取单个文档
     * @async
     * @param {string} id
     * @returns {Promise<object>}
     */
    async get(id) {
      if (!StorageManager.isInitialized) {
        await StorageManager.initialize();
      }

      // 先检查缓存
      if (StorageManager.cache.has(id)) {
        return StorageManager.cache.get(id);
      }

      // 尝试从后端获取
      try {
        const doc = await HTTP.get(`${CONFIG.API_BASE}/documents/${id}`);
        StorageManager.cache.set(id, doc);
        return doc;
      } catch (error) {
        Logger.warn(`获取文档失败: ${id}`, error.message);
        throw error;
      }
    },

    /**
     * 保存文档
     * @async
     * @param {string} id
     * @param {object} data
     * @returns {Promise<object>}
     */
    async save(id, data) {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Document id must be a non-empty string');
      }

      if (typeof data !== 'object' || data === null) {
        throw new ValidationError('Document data must be an object');
      }

      try {
        const result = await HTTP.post(`${CONFIG.API_BASE}/documents`, {
          id,
          ...data,
        });

        StorageManager.cache.set(id, result);
        Logger.debug(`📝 文档已保存: ${id}`);
        return result;
      } catch (error) {
        Logger.error(`保存文档失败: ${id}`, error.message);
        throw error;
      }
    },

    /**
     * 删除文档
     * @async
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Document id must be a non-empty string');
      }

      try {
        await HTTP.delete(`${CONFIG.API_BASE}/documents/${id}`);
        StorageManager.cache.delete(id);
        Logger.debug(`🗑️ 文档已删除: ${id}`);
        return true;
      } catch (error) {
        Logger.error(`删除文档失败: ${id}`, error.message);
        throw error;
      }
    },

    /**
     * 导出所有文档
     * @async
     * @returns {Promise<array>}
     */
    async export() {
      try {
        const data = await HTTP.post(`${CONFIG.API_BASE}/export`, {});
        Logger.info(`📤 已导出 ${data.documents?.length || 0} 个文档`);
        return data.documents || [];
      } catch (error) {
        Logger.error('导出失败:', error.message);
        throw error;
      }
    },

    /**
     * 导入文档
     * @async
     * @param {array} documents
     * @returns {Promise<object>}
     */
    async import(documents) {
      if (!Array.isArray(documents)) {
        throw new ValidationError('Documents must be an array');
      }

      try {
        const result = await HTTP.post(`${CONFIG.API_BASE}/import`, {
          documents,
        });

        // 更新缓存
        (result.documents || []).forEach(doc => {
          StorageManager.cache.set(doc.id, doc);
        });

        Logger.info(`📥 已导入 ${result.documents?.length || 0} 个文档`);
        return result;
      } catch (error) {
        Logger.error('导入失败:', error.message);
        throw error;
      }
    },

    /**
     * 清除缓存
     */
    clearCache() {
      StorageManager.cache.clear();
      StorageManager.isInitialized = false;
      Logger.debug('缓存已清除');
    },
  };

  // =========================================================================
  // IndexedDB 拦截器
  // =========================================================================

  /**
   * 模拟 IndexedDB 接口，转发到本地 API
   */
  class LocalIDB {
    constructor() {
      this.name = 'doocs-md';
      this.version = 1;
    }

    /**
     * 打开数据库（初始化存储）
     */
    open() {
      Logger.info('打开 IndexedDB (本地存储)');

      return {
        oncomplete: null,
        onerror: null,
        objectStore: async (name) => {
          if (!StorageManager.isInitialized) {
            await StorageManager.initialize();
          }
          return new LocalObjectStore(name);
        },
      };
    }
  }

  /**
   * 模拟 ObjectStore 接口
   */
  class LocalObjectStore {
    constructor(name) {
      this.name = name;
    }

    /**
     * 获取所有数据
     */
    getAll() {
      return {
        result: null,
        addEventListener: (event, callback) => {
          if (event === 'success') {
            StorageManager.getAll().then(docs => {
              this.result = docs;
              callback({ target: this });
            });
          }
        },
      };
    }

    /**
     * 获取单条数据
     */
    get(id) {
      return {
        result: null,
        addEventListener: (event, callback) => {
          if (event === 'success') {
            StorageManager.get(id).then(doc => {
              this.result = doc;
              callback({ target: this });
            }).catch(() => {
              this.result = undefined;
              callback({ target: this });
            });
          }
        },
      };
    }

    /**
     * 保存数据
     */
    put(data) {
      return {
        result: null,
        addEventListener: (event, callback) => {
          if (event === 'success') {
            StorageManager.save(data.id, data).then(doc => {
              this.result = data.id;
              callback({ target: this });
            });
          }
        },
      };
    }

    /**
     * 删除数据
     */
    delete(id) {
      return {
        result: null,
        addEventListener: (event, callback) => {
          if (event === 'success') {
            StorageManager.delete(id).then(() => {
              this.result = undefined;
              callback({ target: this });
            });
          }
        },
      };
    }

    /**
     * 清空数据
     */
    clear() {
      return {
        result: null,
        addEventListener: (event, callback) => {
          if (event === 'success') {
            StorageManager.clearCache().then(() => {
              this.result = undefined;
              callback({ target: this });
            });
          }
        },
      };
    }
  }

  // =========================================================================
  // 公共 API
  // =========================================================================

  const PublicAPI = {
    /**
     * 获取所有文档
     */
    async getAll() {
      try {
        return await StorageManager.getAll();
      } catch (error) {
        Logger.error('getAll() 失败:', error.message);
        throw error;
      }
    },

    /**
     * 获取单个文档
     */
    async get(id) {
      try {
        return await StorageManager.get(id);
      } catch (error) {
        Logger.error(`get(${id}) 失败:`, error.message);
        throw error;
      }
    },

    /**
     * 保存文档
     */
    async save(id, data) {
      try {
        return await StorageManager.save(id, data);
      } catch (error) {
        Logger.error(`save(${id}) 失败:`, error.message);
        throw error;
      }
    },

    /**
     * 删除文档
     */
    async delete(id) {
      try {
        return await StorageManager.delete(id);
      } catch (error) {
        Logger.error(`delete(${id}) 失败:`, error.message);
        throw error;
      }
    },

    /**
     * 导出所有文档
     */
    async export() {
      try {
        return await StorageManager.export();
      } catch (error) {
        Logger.error('export() 失败:', error.message);
        throw error;
      }
    },

    /**
     * 导入文档
     */
    async import(documents) {
      try {
        return await StorageManager.import(documents);
      } catch (error) {
        Logger.error('import() 失败:', error.message);
        throw error;
      }
    },

    /**
     * 获取存储状态
     */
    async getStatus() {
      try {
        const response = await fetch(`${CONFIG.API_BASE}/health`);
        return await response.json();
      } catch (error) {
        Logger.error('getStatus() 失败:', error.message);
        throw error;
      }
    },

    /**
     * 清除缓存（调试用）
     */
    clearCache() {
      StorageManager.clearCache();
      Logger.info('缓存已清除');
    },

    /**
     * 设置调试模式
     */
    setDebug(enabled) {
      CONFIG.DEBUG = enabled;
      Logger.info(`调试模式已${enabled ? '启用' : '禁用'}`);
    },
  };

  // =========================================================================
  // 全局暴露
  // =========================================================================

  // 暴露公共 API
  window.__LocalStorage__ = PublicAPI;

  // 拦截 IndexedDB（仅当打开 'doocs-md' 数据库时）
  const originalIndexedDB = window.indexedDB;
  if (originalIndexedDB) {
    const originalOpen = originalIndexedDB.open.bind(originalIndexedDB);

    window.indexedDB.open = function(name, version) {
      if (name === 'doocs-md') {
        Logger.info('🔗 索引 IndexedDB.open(doocs-md) - 使用本地存储');
        const localIDB = new LocalIDB();
        
        // 返回一个兼容的 IDBOpenDBRequest 对象
        return {
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          readyState: 'done',
          result: localIDB,
          addEventListener: function(event, callback) {
            if (event === 'success') {
              callback({ target: this });
            }
          },
        };
      }
      // 其他数据库正常处理
      return originalOpen(name, version);
    };
  }

  // 初始化存储
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await StorageManager.initialize();
    } catch (error) {
      Logger.warn('初始化失败，离线模式:', error.message);
    }
  });

  // 页面卸载时同步数据
  window.addEventListener('beforeunload', () => {
    Logger.debug('页面卸载 - 同步数据');
  });

  Logger.info('✅ 本地存储适配器已加载');
})();
