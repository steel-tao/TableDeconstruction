/**
 * @file src/routes/publish.ts
 * @description 发布流程 API 路由
 */

import express, { Request, Response, Router } from 'express';
import * as PublishService from '../services/publish/db-manager.js';
import * as Renderer from '../core/renderer/index.js';
import * as Validator from '../core/validator/index.js';

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

export function createPublishRouter(): Router {
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

      const record = await PublishService.createPublishRecord(title, content, creator, filePath);

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
  router.get('/records/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = await PublishService.getPublishRecord(id);

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
  router.get('/records', async (req: Request, res: Response) => {
    try {
      const { status, limit = '20', offset = '0' } = req.query;
      const parsedLimit = parseInt(limit as string);
      const parsedOffset = parseInt(offset as string);
      const records = await PublishService.listPublishRecords(
        status as PublishService.PublishStatus | undefined,
        parsedLimit,
        parsedOffset
      );
      const counts = await PublishService.getPublishStats();
      const total = status
        ? counts[status as PublishService.PublishStatus] || 0
        : Object.values(counts).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        data: records,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
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
  router.put('/records/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, creator } = req.body;

      const existing = await PublishService.getPublishRecord(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = await PublishService.updatePublishRecord(id, {
        title: title ?? existing.title,
        content: content ?? existing.content,
        creator: creator ?? existing.creator,
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
  router.delete('/records/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await PublishService.getPublishRecord(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      await PublishService.deletePublishRecord(id);

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
      const record = await PublishService.getPublishRecord(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = await PublishService.submitForReview(id, record.content);

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

      const record = await PublishService.getPublishRecord(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = await PublishService.approvePublish(id, reviewer, comment);

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

      const record = await PublishService.getPublishRecord(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      const updated = await PublishService.rejectPublish(id, reviewer, reason);

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

      const record = await PublishService.getPublishRecord(id);
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

      res.json({
        success: true,
        data: published,
      } as ApiResponse);
    } catch (error) {
      const errorMsg = (error as Error).message;
      res.status(500).json({
        success: false,
        error: errorMsg,
      } as ApiResponse);
    }
  });

  // 获取统计
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const counts = await PublishService.getPublishStats();

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
  router.get('/records/:id/audit-logs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const logs = await PublishService.getAuditLog(id);

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

  // 保存排版内容（HTML + Markdown）
  router.post('/records/:id/content', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { htmlContent, markdownContent } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '记录 ID 不能为空',
        } as ApiResponse);
      }

      if (!htmlContent && !markdownContent) {
        return res.status(400).json({
          success: false,
          error: '必须提供 htmlContent 或 markdownContent',
        } as ApiResponse);
      }

      const update: any = {};
      if (htmlContent) update.htmlContent = htmlContent;
      if (markdownContent) update.markdownContent = markdownContent;

      const updated = await PublishService.updatePublishRecord(id, update);

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

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

  // 预览渲染端点 - 获取排版后的 HTML 预览
  router.get('/records/:id/preview', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { theme = 'default' } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '记录 ID 不能为空',
        } as ApiResponse);
      }

      const record = await PublishService.getPublishRecord(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        } as ApiResponse);
      }

      // 优先使用 htmlContent（Doocs 排版结果），否则用 markdownContent 或 content
      const contentToRender = record.htmlContent || record.markdownContent || record.content;
      const isMarkdown = !record.htmlContent && (record.markdownContent || !record.content.includes('<'));

      let rendered;
      if (isMarkdown) {
        // 如果是 Markdown，渲染为 HTML
        rendered = await Renderer.renderMarkdown(contentToRender, {
          theme: (theme as string) || 'default',
        });
      } else {
        // 如果已是 HTML，直接生成预览
        rendered = {
          html: await Renderer.previewRender(contentToRender),
          generatedAt: new Date(),
          theme: (theme as string) || 'default',
        };
      }

      res.json({
        success: true,
        data: {
          recordId: id,
          title: record.title,
          preview: rendered.html,
          theme: rendered.theme,
          generatedAt: rendered.generatedAt,
        },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 验证内容端点 - 检查内容合规性
  router.post('/validate', async (req: Request, res: Response) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: '内容不能为空',
        } as ApiResponse);
      }

      const result = await Validator.validateMarkdownFile('', content);

      res.json({
        success: true,
        data: {
          passed: result.passed,
          errors: result.errors,
          warnings: result.warnings,
          timestamp: result.timestamp,
        },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 规范化内容端点 - 清理和标准化
  router.post('/normalize', async (req: Request, res: Response) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: '内容不能为空',
        } as ApiResponse);
      }

      const normalized = await Validator.normalizeContent(content);

      res.json({
        success: true,
        data: {
          original: content,
          normalized,
          changes: content !== normalized,
        },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      } as ApiResponse);
    }
  });

  // 健康检查
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const stats = await PublishService.getPublishStats();
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
