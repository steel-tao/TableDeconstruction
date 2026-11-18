/**
 * 本地存储 API - 替代 IndexedDB
 * 所有前端的 IndexedDB 操作都转发到这里
 * 数据持久化到本地文件系统
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 本地存储根路径
const STORAGE_ROOT = path.join(__dirname, 'local-storage');
const DOCUMENTS_PATH = path.join(STORAGE_ROOT, 'documents');
const META_PATH = path.join(STORAGE_ROOT, 'metadata.json');

/**
 * 初始化存储目录
 */
export async function initializeStorage() {
  try {
    await fs.mkdir(DOCUMENTS_PATH, { recursive: true });
    console.log('✅ 本地存储已初始化:', DOCUMENTS_PATH);
  } catch (error) {
    console.error('❌ 存储初始化失败:', error.message);
    throw error;
  }
}

/**
 * 获取所有文档
 */
async function getAllDocuments() {
  try {
    const files = await fs.readdir(DOCUMENTS_PATH);
    const documents = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(DOCUMENTS_PATH, file);
        const content = await fs.readFile(filePath, 'utf-8');
        documents.push(JSON.parse(content));
      }
    }
    
    return documents;
  } catch (error) {
    console.error('读取文档失败:', error);
    return [];
  }
}

/**
 * 获取单个文档
 */
async function getDocument(id) {
  try {
    const filePath = path.join(DOCUMENTS_PATH, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 保存文档
 */
async function saveDocument(id, data) {
  try {
    // 确保有创建时间和更新时间
    const now = new Date().toISOString();
    const document = {
      id,
      ...data,
      createDatetime: data.createDatetime || now,
      updateDatetime: now,
    };
    
    const filePath = path.join(DOCUMENTS_PATH, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(document, null, 2), 'utf-8');
    
    console.log(`📝 文档已保存: ${id}`);
    return document;
  } catch (error) {
    console.error('保存文档失败:', error);
    throw error;
  }
}

/**
 * 删除文档
 */
async function deleteDocument(id) {
  try {
    const filePath = path.join(DOCUMENTS_PATH, `${id}.json`);
    await fs.unlink(filePath);
    console.log(`🗑️ 文档已删除: ${id}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * 创建 Express 路由
 */
export function createStorageRouter() {
  const router = express.Router();

  /**
   * GET /api/storage/documents
   * 获取所有文档列表
   */
  router.get('/documents', async (req, res) => {
    try {
      const documents = await getAllDocuments();
      res.json({
        success: true,
        data: documents,
        count: documents.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/storage/documents/:id
   * 获取单个文档
   */
  router.get('/documents/:id', async (req, res) => {
    try {
      const document = await getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }
      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/storage/documents
   * 创建或更新文档
   * Body: { id, title, content, ... }
   */
  router.post('/documents', express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { id, ...data } = req.body;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Document id is required',
        });
      }

      const document = await saveDocument(id, data);
      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/storage/documents/:id
   * 删除文档
   */
  router.delete('/documents/:id', async (req, res) => {
    try {
      const deleted = await deleteDocument(req.params.id);
      res.json({
        success: true,
        deleted,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/storage/export
   * 导出所有文档为压缩包（可选）
   */
  router.post('/export', async (req, res) => {
    try {
      const documents = await getAllDocuments();
      res.json({
        success: true,
        data: documents,
        exportDate: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/storage/import
   * 导入文档
   */
  router.post('/import', express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { documents } = req.body;
      if (!Array.isArray(documents)) {
        return res.status(400).json({
          success: false,
          error: 'Documents must be an array',
        });
      }

      const results = [];
      for (const doc of documents) {
        if (doc.id) {
          const saved = await saveDocument(doc.id, doc);
          results.push(saved);
        }
      }

      res.json({
        success: true,
        imported: results.length,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}

/**
 * 获取存储统计信息
 */
export async function getStorageStats() {
  try {
    const documents = await getAllDocuments();
    let totalSize = 0;
    
    for (const doc of documents) {
      totalSize += JSON.stringify(doc).length;
    }

    return {
      documentCount: documents.length,
      totalSize: Math.round(totalSize / 1024) + ' KB',
      storagePath: STORAGE_ROOT,
    };
  } catch (error) {
    return { error: error.message };
  }
}
