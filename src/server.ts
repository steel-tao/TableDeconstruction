/**
 * @file src/server.ts
 * @description 完整的 Express 服务器 - 整合所有 API 和服务
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { initDatabase, getDatabase } from './db/database';
import * as PublishService from './services/publish/db-manager';
import publishRoutes from './routes/publish';

// ============================================================================
// 类型定义
// ============================================================================

export interface ServerConfig {
  port: number;
  host: string;
  dbPath: string;
  env: 'development' | 'production' | 'test';
  corsOrigin?: string | string[];
}

// ============================================================================
// 全局变量
// ============================================================================

let app: Express | null = null;
let server: any = null;

// ============================================================================
// 服务器创建函数
// ============================================================================

/**
 * 创建并初始化 Express 服务器
 */
export async function createServer(config: ServerConfig): Promise<Express> {
  console.log('🚀 初始化 Express 服务器...');

  // 创建 Express 应用
  app = express();

  // ========================================================================
  // 中间件配置
  // ========================================================================

  // CORS
  app.use(
    cors({
      origin: config.corsOrigin || '*',
      credentials: true,
    })
  );

  // JSON 解析
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 请求日志
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} ${res.statusCode} (${duration}ms)`
      );
    });
    next();
  });

  // ========================================================================
  // 初始化数据库
  // ========================================================================

  console.log('🗄️  初始化数据库...');
  await initDatabase(config.dbPath);

  // ========================================================================
  // 初始化发布服务
  // ========================================================================

  console.log('📝 初始化发布服务...');
  PublishService.initPublishManager();

  // ========================================================================
  // 健康检查端点
  // ========================================================================

  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
    });
  });

  // ========================================================================
  // API 路由
  // ========================================================================

  // 发布路由
  app.use('/api/publish', publishRoutes);

  // ========================================================================
  // 存储 API（来自 Doocs）
  // ========================================================================

  app.get('/api/storage/documents', (req: Request, res: Response) => {
    try {
      const dbPath = path.join(config.dbPath, '..', 'doocs');
      const storageFile = path.join(dbPath, 'storage.json');

      if (!fs.existsSync(storageFile)) {
        return res.json({
          success: true,
          data: [],
          count: 0,
        });
      }

      const data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
      res.json({
        success: true,
        data: data.documents || [],
        count: (data.documents || []).length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ========================================================================
  // 错误处理
  // ========================================================================

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('未捕获的错误:', err);

    res.status(err.status || 500).json({
      success: false,
      error: err.message || '内部服务器错误',
      code: err.code || 'INTERNAL_ERROR',
    });
  });

  // ========================================================================
  // 404 处理
  // ========================================================================

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: '端点不存在',
      code: 'NOT_FOUND',
      path: req.path,
    });
  });

  console.log('✓ Express 服务器已创建');
  return app;
}

// ============================================================================
// 服务器启动/停止函数
// ============================================================================

/**
 * 启动服务器
 */
export async function startServer(config: ServerConfig): Promise<void> {
  try {
    console.log('📡 启动服务器...\n');

    // 创建服务器
    if (!app) {
      app = await createServer(config);
    }

    // 启动监听
    server = app.listen(config.port, config.host, () => {
      console.log(`\n✅ 服务器已启动:`);
      console.log(`   地址: http://${config.host}:${config.port}`);
      console.log(`   环境: ${config.env}`);
      console.log(`   数据库: ${config.dbPath}`);
      console.log('\n📚 API 路由:');
      console.log('   POST   /api/publish/records           创建发布记录');
      console.log('   GET    /api/publish/records           列出发布记录');
      console.log('   GET    /api/publish/records/:id       获取发布记录');
      console.log('   DELETE /api/publish/records/:id       删除发布记录');
      console.log('\n   POST   /api/publish/:id/submit       提交审核');
      console.log('   POST   /api/publish/:id/approve       批准发布');
      console.log('   POST   /api/publish/:id/reject        拒绝发布');
      console.log('   POST   /api/publish/:id/execute       执行发布');
      console.log('\n   GET    /api/publish/stats             统计信息');
      console.log('   GET    /api/publish/:id/logs          审计日志');
      console.log('\n   GET    /health                        健康检查\n');
    });

    // 处理优雅关闭
    process.on('SIGTERM', () => stopServer());
    process.on('SIGINT', () => stopServer());
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    process.exit(1);
  }
}

/**
 * 停止服务器
 */
export async function stopServer(): Promise<void> {
  console.log('\n📛 停止服务器...');

  if (server) {
    server.close(async () => {
      console.log('✓ 服务器已关闭');

      // 关闭数据库
      try {
        const db = getDatabase();
        await db.close();
        console.log('✓ 数据库已关闭');
      } catch (error) {
        console.error('关闭数据库失败:', error);
      }

      process.exit(0);
    });

    // 超时强制关闭
    setTimeout(() => {
      console.error('❌ 服务器关闭超时，强制退出');
      process.exit(1);
    }, 30000);
  }
}

/**
 * 获取服务器实例
 */
export function getServer(): Express | null {
  return app;
}

export default {
  createServer,
  startServer,
  stopServer,
  getServer,
};
