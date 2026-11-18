/**
 * @file src/routes/doocs.ts
 * @description Doocs 渲染 API 路由 - 将 Markdown 转换为微信兼容 HTML
 */

import { Router, Request, Response } from 'express';
import {
  renderMarkdownToWechat,
  isDoocsAvailable,
  DoocsRenderOptions,
} from '../services/doocs/index.js';

export default function doocsRoutes(): Router {
  const router = Router();

  /**
   * POST /api/doocs/render
   * 渲染 Markdown 为微信兼容 HTML
   *
   * 请求体:
   * {
   *   "markdown": "# 标题\n这是内容",
   *   "options": {
   *     "theme": "default",
   *     "fullPage": false
   *   }
   * }
   *
   * 响应:
   * {
   *   "success": true,
   *   "html": "<h1>...</h1>",
   *   "error": null
   * }
   */
  router.post('/render', async (req: Request, res: Response) => {
    try {
      const { markdown, options } = req.body;

      // 验证输入
      if (!markdown || typeof markdown !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'markdown field is required and must be a string',
        });
      }

      // 渲染 Markdown
      const result = await renderMarkdownToWechat(
        markdown,
        options as DoocsRenderOptions
      );

      return res.json(result);
    } catch (error) {
      console.error('Doocs render error:', error);
      return res.status(500).json({
        success: false,
        error: `Rendering failed: ${(error as Error).message}`,
      });
    }
  });

  /**
   * GET /api/doocs/status
   * 检查 Doocs 服务状态
   *
   * 响应:
   * {
   *   "available": true,
   *   "url": "http://127.0.0.1:8800"
   * }
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const available = await isDoocsAvailable();
      return res.json({
        available,
        url: 'http://127.0.0.1:8800',
        message: available
          ? 'Doocs service is running'
          : 'Doocs service is not available',
      });
    } catch (error) {
      return res.status(500).json({
        available: false,
        error: `Status check failed: ${(error as Error).message}`,
      });
    }
  });

  /**
   * POST /api/doocs/batch-render
   * 批量渲染多个 Markdown 文件
   *
   * 请求体:
   * {
   *   "items": [
   *     { "id": "1", "markdown": "# 文章1" },
   *     { "id": "2", "markdown": "# 文章2" }
   *   ]
   * }
   *
   * 响应:
   * {
   *   "success": true,
   *   "results": [
   *     { "id": "1", "html": "...", "success": true },
   *     { "id": "2", "html": "...", "success": true }
   *   ]
   * }
   */
  router.post('/batch-render', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          error: 'items field is required and must be an array',
        });
      }

      // 批量渲染
      const results = await Promise.all(
        items.map(async (item: any) => {
          const result = await renderMarkdownToWechat(item.markdown, item.options);
          return {
            id: item.id,
            ...result,
          };
        })
      );

      return res.json({
        success: true,
        results,
      });
    } catch (error) {
      console.error('Batch render error:', error);
      return res.status(500).json({
        success: false,
        error: `Batch rendering failed: ${(error as Error).message}`,
      });
    }
  });

  return router;
}
