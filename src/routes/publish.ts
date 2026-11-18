/**
 * @file src/routes/publish.ts
 * @description 发布流程 API 路由
 */

import express, { Request, Response, Router } from 'express';
import { PublishStore } from '../db/publish-store';
import * as PublishService from '../services/publish/index';
import { PublishStatus } from '../services/publish/index';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export function createPublishRouter(store: PublishStore): Router {
  const router = express.Router();

  // 创建发布记录
  router.post('/records', async (req: Request, res: Response) => {
    try {
      const { title, content, creator, filePath } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: '标题和内容不能为空',
        } as ApiResponse);
      }

      const record = await PublishService.createPublishRecord(
        title,
        content,
        creator,
        filePath
      );

      store.createRecord(record);

      res.status(201).json({
        success: true,
        data: record,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 获取发布记录
  router.get('/records/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = store.getRecord(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: record,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 列出发布记录
  router.get('/records', (req: Request, res: Response) => {
    try {
      const { status, limit = '20', offset = '0' } = req.query;
      const { records, total } = store.listRecords(
        status as PublishStatus | undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: records,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 更新发布记录
  router.put('/records/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, creator } = req.body;

      const existing = store.getRecord(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = store.updateRecord(id, {
        title: title || existing.title,
        content: content || existing.content,
        creator: creator || existing.creator,
      });

      res.json({
        success: true,
        data: updated,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 删除发布记录
  router.delete('/records/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = store.getRecord(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      store.deleteRecord(id);

      res.json({
        success: true,
        data: { message: '记录已删除' },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 提交审核
  router.post('/records/:id/submit-review', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = store.getRecord(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = store.updateRecord(id, {
        status: PublishStatus.PENDING_REVIEW,
      });

      res.json({
        success: true,
        data: updated,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 审核通过
  router.post('/records/:id/approve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewer, comment } = req.body;

      const record = store.getRecord(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = store.updateRecord(id, {
        status: PublishStatus.APPROVED,
        reviewer,
        reviewComment: comment,
      });

      res.json({
        success: true,
        data: updated,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 拒绝发布
  router.post('/records/:id/reject', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewer, reason } = req.body;

      const record = store.getRecord(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = store.updateRecord(id, {
        status: PublishStatus.DRAFT,
        reviewer,
        reviewComment: `拒绝理由: ${reason}`,
      });

      res.json({
        success: true,
        data: updated,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 发布到微信
  router.post('/records/:id/publish', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const { scheduledTime } = req.body;

      const record = store.getRecord(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const published = await PublishService.executePublish(
        id,
        scheduledTime ? new Date(scheduledTime) : undefined
      );

      if (published) {
        store.updateRecord(id, {
          status: published.status,
          wechatMsgId: published.wechatMsgId,
          publishedAt: published.publishedAt,
        });
      }

      res.json({
        success: true,
        data: published,
      } as ApiResponse);
    } catch (error) {
      const errorMsg = (error as Error).message;
      store.updateRecord(id, {
        status: PublishStatus.FAILED,
        reviewComment: `发布失败: ${errorMsg}`,
      });

      res.status(500).json({
        success: false,
        error: errorMsg,
      } as ApiResponse);
    }
  });

  // 获取统计
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const counts = store.countByStatus();

      res.json({
        success: true,
        data: {
          byStatus: counts,
          total: Object.values(counts).reduce((a, b) => a + b, 0),
        },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 获取审核日志
  router.get('/records/:id/audit-logs', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const logs = store.getAuditLogs(id);

      res.json({
        success: true,
        data: logs,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 健康检查
  router.get('/health', (req: Request, res: Response) => {
    try {
      const stats = store.countByStatus();
      const total = Object.values(stats).reduce((a, b) => a + b, 0);

      res.json({
        success: true,
        data: {
          status: 'healthy',
          totalRecords: total,
          byStatus: stats,
        },
      } as ApiResponse);
    } catch (error) {
      res.status(503).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  return router;
}

export default createPublishRouter;
