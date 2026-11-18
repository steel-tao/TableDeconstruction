/**
 * 本地存储 API - 生产级实现
 * 替代浏览器 IndexedDB，提供持久化存储
 *
 * @module local-storage-api
 * @version 1.0.0
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  // 存储路径
  STORAGE_ROOT: path.join(__dirname, 'local-storage'),
  DOCUMENTS_PATH: path.join(__dirname, 'local-storage', 'documents'),
  METADATA_PATH: path.join(__dirname, 'local-storage', 'metadata.json'),
  
  // 限制
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_DOCUMENT_ID_LENGTH: 255,
  MAX_TITLE_LENGTH: 1000,
  MAX_CONTENT_LENGTH: 10 * 1024 * 1024, // 10MB
  MAX_BATCH_SIZE: 100,
  
  // 超时
  OPERATION_TIMEOUT: 30000, // 30秒
  
  // 验证规则
  DOCUMENT_ID_PATTERN: /^[a-zA-Z0-9_\-\.]+$/,
};

// ============================================================================
// 日志记录
// ============================================================================

const Logger = {
  info: (msg, data = '') => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  warn: (msg, data = '') => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = '') => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error instanceof Error ? error.message : error),
  debug: (msg, data = '') => process.env.DEBUG && console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data),
};

// ============================================================================
// 错误类定义
// ============================================================================

class StorageError extends Error {
  constructor(message, code = 'STORAGE_ERROR', statusCode = 500) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class ValidationError extends StorageError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends StorageError {
  constructor(message = 'Document not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends StorageError {
  constructor(message = 'Document already exists') {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

// ============================================================================
// 验证函数
// ============================================================================

const Validators = {
  /**
   * 验证文档 ID
   * @param {string} id
   * @returns {boolean}
   */
  validateId: (id) => {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Document ID must be a non-empty string');
    }
    if (id.length > CONFIG.MAX_DOCUMENT_ID_LENGTH) {
      throw new ValidationError(`Document ID must be less than ${CONFIG.MAX_DOCUMENT_ID_LENGTH} characters`);
    }
    if (!CONFIG.DOCUMENT_ID_PATTERN.test(id)) {
      throw new ValidationError('Document ID can only contain alphanumeric characters, underscore, hyphen, and dot');
    }
    return true;
  },

  /**
   * 验证文档标题
   * @param {string} title
   */
  validateTitle: (title) => {
    if (title && typeof title !== 'string') {
      throw new ValidationError('Title must be a string');
    }
    if (title && title.length > CONFIG.MAX_TITLE_LENGTH) {
      throw new ValidationError(`Title must be less than ${CONFIG.MAX_TITLE_LENGTH} characters`);
    }
  },

  /**
   * 验证文档内容
   * @param {string} content
   */
  validateContent: (content) => {
    if (content && typeof content !== 'string') {
      throw new ValidationError('Content must be a string');
    }
    if (content && content.length > CONFIG.MAX_CONTENT_LENGTH) {
      throw new ValidationError(`Content must be less than ${Math.round(CONFIG.MAX_CONTENT_LENGTH / 1024 / 1024)}MB`);
    }
  },

  /**
   * 验证文档对象
   * @param {object} data
   */
  validateDocument: (data) => {
    if (typeof data !== 'object' || data === null) {
      throw new ValidationError('Document must be an object');
    }
    if (data.title) Validators.validateTitle(data.title);
    if (data.content) Validators.validateContent(data.content);
  },

  /**
   * 验证文档数组
   * @param {array} documents
   */
  validateDocuments: (documents) => {
    if (!Array.isArray(documents)) {
      throw new ValidationError('Documents must be an array');
    }
    if (documents.length > CONFIG.MAX_BATCH_SIZE) {
      throw new ValidationError(`Batch size must not exceed ${CONFIG.MAX_BATCH_SIZE}`);
    }
    documents.forEach((doc, idx) => {
      if (!doc.id) {
        throw new ValidationError(`Document at index ${idx} must have an id`);
      }
      Validators.validateId(doc.id);
      Validators.validateDocument(doc);
    });
  },
};

// ============================================================================
// 存储操作
// ============================================================================

const Storage = {
  /**
   * 初始化存储目录
   * @async
   * @returns {Promise<object>}
   */
  async initialize() {
    try {
      Logger.info('初始化存储目录:', CONFIG.DOCUMENTS_PATH);
      await fs.mkdir(CONFIG.DOCUMENTS_PATH, { recursive: true });
      Logger.info('✅ 存储目录初始化成功');
      return { success: true };
    } catch (error) {
      Logger.error('存储初始化失败:', error);
      throw new StorageError('Failed to initialize storage', 'INIT_FAILED', 500);
    }
  },

  /**
   * 获取所有文档
   * @async
   * @returns {Promise<array>}
   */
  async getAllDocuments() {
    try {
      const files = await fs.readdir(CONFIG.DOCUMENTS_PATH);
      const documents = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const filePath = path.join(CONFIG.DOCUMENTS_PATH, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const doc = JSON.parse(content);
          documents.push(doc);
        } catch (err) {
          Logger.warn(`跳过不合法的文件: ${file}`, err.message);
          // 继续处理其他文件
        }
      }

      return documents;
    } catch (error) {
      Logger.error('读取文档列表失败:', error);
      throw new StorageError('Failed to read documents', 'READ_FAILED', 500);
    }
  },

  /**
   * 获取单个文档
   * @async
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getDocument(id) {
    Validators.validateId(id);
    try {
      const filePath = path.join(CONFIG.DOCUMENTS_PATH, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError(`Document "${id}" not found`);
      }
      Logger.error(`读取文档失败: ${id}`, error);
      throw new StorageError('Failed to read document', 'READ_FAILED', 500);
    }
  },

  /**
   * 保存文档
   * @async
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async saveDocument(id, data) {
    Validators.validateId(id);
    Validators.validateDocument(data);

    try {
      const now = new Date().toISOString();
      const document = {
        id,
        title: data.title || 'Untitled',
        content: data.content || '',
        metadata: data.metadata || {},
        createDatetime: data.createDatetime || now,
        updateDatetime: now,
        ...data,
      };

      const filePath = path.join(CONFIG.DOCUMENTS_PATH, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(document, null, 2), 'utf-8');

      Logger.info(`📝 文档已保存: ${id}`);
      return document;
    } catch (error) {
      Logger.error(`保存文档失败: ${id}`, error);
      throw new StorageError('Failed to save document', 'WRITE_FAILED', 500);
    }
  },

  /**
   * 删除文档
   * @async
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteDocument(id) {
    Validators.validateId(id);
    try {
      const filePath = path.join(CONFIG.DOCUMENTS_PATH, `${id}.json`);
      await fs.unlink(filePath);
      Logger.info(`🗑️ 文档已删除: ${id}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError(`Document "${id}" not found`);
      }
      Logger.error(`删除文档失败: ${id}`, error);
      throw new StorageError('Failed to delete document', 'DELETE_FAILED', 500);
    }
  },

  /**
   * 获取存储统计
   * @async
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const documents = await Storage.getAllDocuments();
      let totalSize = 0;

      for (const doc of documents) {
        totalSize += JSON.stringify(doc).length;
      }

      return {
        documentCount: documents.length,
        totalSize: totalSize,
        totalSizeFormatted: this._formatBytes(totalSize),
        storagePath: CONFIG.DOCUMENTS_PATH,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      Logger.error('获取存储统计失败:', error);
      throw new StorageError('Failed to get storage stats', 'STATS_FAILED', 500);
    }
  },

  /**
   * 格式化字节数
   * @private
   */
  _formatBytes: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },
};

// ============================================================================
// 响应工具
// ============================================================================

const ResponseUtils = {
  /**
   * 成功响应
   */
  success: (res, data, statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      code: 'SUCCESS',
      data,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 错误响应
   */
  error: (res, error) => {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'UNKNOWN_ERROR';
    const message = error.message || 'An unexpected error occurred';

    Logger.error(`API 错误 [${statusCode}] ${code}:`, message);

    res.status(statusCode).json({
      success: false,
      code,
      error: message,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 分页响应
   */
  paginated: (res, data, page = 1, pageSize = 20) => {
    const total = data.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = data.slice(start, end);

    res.json({
      success: true,
      code: 'SUCCESS',
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      timestamp: new Date().toISOString(),
    });
  },
};

// ============================================================================
// 中间件
// ============================================================================

const Middleware = {
  /**
   * 请求日志中间件
   */
  requestLogger: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      Logger.info(`${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  },

  /**
   * 错误处理中间件
   */
  errorHandler: (err, req, res, next) => {
    if (err instanceof StorageError) {
      ResponseUtils.error(res, err);
    } else if (err instanceof SyntaxError && err instanceof SyntaxError && err.status === 400) {
      ResponseUtils.error(res, new ValidationError('Invalid JSON in request body'));
    } else {
      Logger.error('未处理的错误:', err);
      ResponseUtils.error(res, new StorageError('Internal server error'));
    }
  },

  /**
   * 输入验证中间件（用于 POST/PUT 请求）
   */
  validateJsonBody: express.json({ limit: CONFIG.MAX_DOCUMENT_SIZE.toString() }),
};

// ============================================================================
// 路由创建
// ============================================================================

/**
 * 创建存储路由
 * @param {Express} router - Express 路由器
 * @returns {Express.Router}
 */
export function createStorageRouter() {
  const router = express.Router();

  // 应用中间件
  router.use(Middleware.requestLogger);

  /**
   * GET /api/storage/documents
   * 获取所有文档列表（支持分页）
   *
   * @query {number} page - 页码（默认 1）
   * @query {number} pageSize - 每页数量（默认 20）
   */
  router.get('/documents', async (req, res) => {
    try {
      const documents = await Storage.getAllDocuments();
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize) || 20));

      ResponseUtils.paginated(res, documents, page, pageSize);
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * GET /api/storage/documents/:id
   * 获取单个文档
   *
   * @param {string} id - 文档 ID
   */
  router.get('/documents/:id', async (req, res) => {
    try {
      const document = await Storage.getDocument(req.params.id);
      ResponseUtils.success(res, document);
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * POST /api/storage/documents
   * 创建或更新文档
   *
   * @body {string} id - 文档 ID（必需）
   * @body {string} title - 文档标题
   * @body {string} content - 文档内容
   * @body {object} metadata - 文档元数据
   */
  router.post('/documents', Middleware.validateJsonBody, async (req, res) => {
    try {
      const { id, ...data } = req.body;
      if (!id) {
        throw new ValidationError('Document id is required in request body');
      }

      const document = await Storage.saveDocument(id, data);
      ResponseUtils.success(res, document, 201);
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * DELETE /api/storage/documents/:id
   * 删除文档
   *
   * @param {string} id - 文档 ID
   */
  router.delete('/documents/:id', async (req, res) => {
    try {
      await Storage.deleteDocument(req.params.id);
      ResponseUtils.success(res, { deleted: true, id: req.params.id });
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * POST /api/storage/export
   * 导出所有文档
   */
  router.post('/export', async (req, res) => {
    try {
      const documents = await Storage.getAllDocuments();
      ResponseUtils.success(res, {
        format: 'json',
        documents,
        count: documents.length,
        exportDate: new Date().toISOString(),
      });
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * POST /api/storage/import
   * 批量导入文档
   *
   * @body {array} documents - 文档数组
   */
  router.post('/import', Middleware.validateJsonBody, async (req, res) => {
    try {
      const { documents } = req.body;
      Validators.validateDocuments(documents);

      const results = [];
      const errors = [];

      for (let i = 0; i < documents.length; i++) {
        try {
          const doc = documents[i];
          const saved = await Storage.saveDocument(doc.id, doc);
          results.push(saved);
        } catch (err) {
          errors.push({
            index: i,
            id: documents[i].id,
            error: err.message,
          });
        }
      }

      ResponseUtils.success(res, {
        imported: results.length,
        failed: errors.length,
        documents: results,
        errors: errors.length > 0 ? errors : undefined,
      }, 201);
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * GET /api/storage/stats
   * 获取存储统计信息
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = await Storage.getStats();
      ResponseUtils.success(res, stats);
    } catch (error) {
      ResponseUtils.error(res, error);
    }
  });

  /**
   * GET /api/storage/health
   * 健康检查
   */
  router.get('/health', async (req, res) => {
    try {
      await Storage.getStats();
      ResponseUtils.success(res, {
        status: 'healthy',
        version: '1.0.0',
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
      });
    }
  });

  // 错误处理中间件（必须放在最后）
  router.use(Middleware.errorHandler);

  return router;
}

/**
 * 初始化存储
 * @async
 * @returns {Promise<object>}
 */
export async function initializeStorage() {
  return Storage.initialize();
}

/**
 * 获取存储统计
 * @async
 * @returns {Promise<object>}
 */
export async function getStorageStats() {
  return Storage.getStats();
}

export { CONFIG, Logger, Validators, Storage, ResponseUtils };
