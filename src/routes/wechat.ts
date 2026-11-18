/**
 * @file src/routes/wechat.ts
 * @description WeChat API 路由 - 处理 Token 获取、发布等操作
 */

import express, { Request, Response, Router } from 'express';
import * as WechatService from '../services/wechat/index.js';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export default function wechatRoutes(): Router {
  const router = express.Router();

  /**
   * GET /api/wechat/token
   * 获取 WeChat Access Token
   */
  router.post('/token', async (req: Request, res: Response) => {
    try {
      const accessToken = await WechatService.getAccessToken();
      const response: ApiResponse<{ access_token: string }> = {
        success: true,
        data: {
          access_token: accessToken,
        },
      };
      res.json(response);
    } catch (error) {
      console.error('获取 Token 失败:', error);
      res.status(500).json({
        success: false,
        error: `获取 Token 失败: ${(error as Error).message}`,
        code: 'WECHAT_TOKEN_ERROR',
      } as ApiResponse);
    }
  });

  /**
   * POST /api/wechat/draft
   * 保存为草稿
   */
  router.post('/draft', async (req: Request, res: Response) => {
    try {
      const { title, author, content, digest, thumb_media_id } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: '标题和内容不能为空',
          code: 'MISSING_REQUIRED_FIELDS',
        } as ApiResponse);
      }

      const mediaId = await WechatService.saveDraft({
        title,
        author: author || '智能发布系统',
        content,
        digest: digest || content.substring(0, 100),
        thumb_media_id,
      });

      res.json({
        success: true,
        data: { media_id: mediaId },
      } as ApiResponse);
    } catch (error) {
      console.error('保存草稿失败:', error);
      res.status(500).json({
        success: false,
        error: `保存草稿失败: ${(error as Error).message}`,
        code: 'WECHAT_DRAFT_ERROR',
      } as ApiResponse);
    }
  });

  /**
   * POST /api/wechat/publish
   * 发布文章
   */
  router.post('/publish', async (req: Request, res: Response) => {
    try {
      const { title, author, content, digest, thumb_media_id, publish_time, istop } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: '标题和内容不能为空',
          code: 'MISSING_REQUIRED_FIELDS',
        } as ApiResponse);
      }

      const msgId = await WechatService.publishArticle(
        {
          title,
          author: author || '智能发布系统',
          content,
          digest: digest || content.substring(0, 100),
          thumb_media_id,
        },
        {
          publish_time,
          istop,
        }
      );

      res.json({
        success: true,
        data: { msg_id: msgId },
      } as ApiResponse);
    } catch (error) {
      console.error('发布文章失败:', error);
      res.status(500).json({
        success: false,
        error: `发布文章失败: ${(error as Error).message}`,
        code: 'WECHAT_PUBLISH_ERROR',
      } as ApiResponse);
    }
  });

  /**
   * GET /api/wechat/history
   * 获取发布历史
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await WechatService.getPublishHistory(limit);

      res.json({
        success: true,
        data: history,
      } as ApiResponse);
    } catch (error) {
      console.error('获取发布历史失败:', error);
      res.status(500).json({
        success: false,
        error: `获取发布历史失败: ${(error as Error).message}`,
        code: 'WECHAT_HISTORY_ERROR',
      } as ApiResponse);
    }
  });

  /**
   * DELETE /api/wechat/published/:msgId
   * 删除已发布的文章
   */
  router.delete('/published/:msgId', async (req: Request, res: Response) => {
    try {
      const { msgId } = req.params;
      const success = await WechatService.deletePublished(msgId);

      res.json({
        success,
        data: { deleted: success },
      } as ApiResponse);
    } catch (error) {
      console.error('删除文章失败:', error);
      res.status(500).json({
        success: false,
        error: `删除文章失败: ${(error as Error).message}`,
        code: 'WECHAT_DELETE_ERROR',
      } as ApiResponse);
    }
  });

  return router;
}
