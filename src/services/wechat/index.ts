/**
 * @file src/services/wechat/index.ts
 * @description 微信公众平台API集成
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// 类型定义
// ============================================================================

export interface WechatConfig {
  // 应用ID
  appId: string;
  // 应用密钥
  appSecret: string;
  // 接收消息的验证token
  token?: string;
  // 接收消息的加密密钥
  encodingAesKey?: string;
}

export interface DraftArticle {
  // 标题
  title: string;
  // 作者
  author: string;
  // 内容（HTML）
  content: string;
  // 摘要
  digest: string;
  // 展示的图片
  thumb_media_id?: string;
}

export interface PublishOptions {
  // 是否立即发布（否则为草稿）
  publish?: boolean;
  // 发布时间（Unix时间戳）
  publish_time?: number;
  // 是否置顶
  istop?: boolean;
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

export interface DraftResponse {
  media_id: string;
  errcode?: number;
  errmsg?: string;
}

export interface PublishResponse {
  msg_id: string;
  errcode?: number;
  errmsg?: string;
}

// ============================================================================
// WeChat 客户端类
// ============================================================================

class WechatClient {
  private config: WechatConfig;
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpireAt: number = 0;
  private readonly API_BASE = 'https://api.weixin.qq.com';
  private readonly MOCK_MODE: boolean;

  constructor(config: WechatConfig, mockMode: boolean = true) {
    this.config = config;
    this.MOCK_MODE = mockMode;
    this.httpClient = axios.create({
      baseURL: this.API_BASE,
      timeout: 30000,
    });
  }

  /**
   * 获取 Access Token
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存是否仍有效
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }

    if (this.MOCK_MODE) {
      return this.getMockAccessToken();
    }

    try {
      const response = await this.httpClient.get<AccessTokenResponse>(
        '/cgi-bin/token',
        {
          params: {
            grant_type: 'client_credential',
            appid: this.config.appId,
            secret: this.config.appSecret,
          },
        }
      );

      if (response.data.errcode) {
        throw new Error(
          `获取 Access Token 失败: ${response.data.errmsg}`
        );
      }

      this.accessToken = response.data.access_token;
      this.tokenExpireAt =
        Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟刷新

      return this.accessToken;
    } catch (error) {
      throw new Error(`WeChat API 错误: ${error}`);
    }
  }

  /**
   * 保存为草稿
   */
  async saveDraft(article: DraftArticle): Promise<string> {
    if (this.MOCK_MODE) {
      return this.mockSaveDraft(article);
    }

    const token = await this.getAccessToken();
    const payload = {
      articles: [
        {
          title: article.title,
          author: article.author,
          digest: article.digest,
          show_cover_pic: article.thumb_media_id ? 1 : 0,
          content: article.content,
          content_source_url: '',
          thumb_media_id: article.thumb_media_id || '',
        },
      ],
    };

    try {
      const response = await this.httpClient.post<DraftResponse>(
        '/cgi-bin/draft/add',
        payload,
        {
          params: { access_token: token },
        }
      );

      if (response.data.errcode) {
        throw new Error(`保存草稿失败: ${response.data.errmsg}`);
      }

      return response.data.media_id;
    } catch (error) {
      throw new Error(`WeChat 草稿 API 错误: ${error}`);
    }
  }

  /**
   * 发布文章
   */
  async publishArticle(
    article: DraftArticle,
    options: PublishOptions = {}
  ): Promise<string> {
    if (this.MOCK_MODE) {
      return this.mockPublishArticle(article, options);
    }

    // 先保存为草稿
    const mediaId = await this.saveDraft(article);

    const token = await this.getAccessToken();
    const payload = {
      media_ids: [mediaId],
      publish_time: options.publish_time || 0,
    };

    try {
      const response = await this.httpClient.post<PublishResponse>(
        '/cgi-bin/freepublish/submit',
        payload,
        {
          params: { access_token: token },
        }
      );

      if (response.data.errcode) {
        throw new Error(`发布文章失败: ${response.data.errmsg}`);
      }

      return response.data.msg_id;
    } catch (error) {
      throw new Error(`WeChat 发布 API 错误: ${error}`);
    }
  }

  /**
   * 获取发布记录
   */
  async getPublishHistory(limit: number = 10): Promise<any[]> {
    if (this.MOCK_MODE) {
      return this.mockGetPublishHistory(limit);
    }

    const token = await this.getAccessToken();
    const payload = {
      type: 'news',
      begin: 0,
      count: limit,
    };

    try {
      const response = await this.httpClient.post(
        '/cgi-bin/freepublish/getarticleid',
        payload,
        {
          params: { access_token: token },
        }
      );

      return response.data.item || [];
    } catch (error) {
      throw new Error(`WeChat 发布历史 API 错误: ${error}`);
    }
  }

  /**
   * 删除已发布的文章
   */
  async deletePublished(msgId: string): Promise<boolean> {
    if (this.MOCK_MODE) {
      return true; // Mock 总是成功
    }

    const token = await this.getAccessToken();
    const payload = {
      article_id: msgId,
    };

    try {
      const response = await this.httpClient.post(
        '/cgi-bin/freepublish/delete',
        payload,
        {
          params: { access_token: token },
        }
      );

      return !response.data.errcode;
    } catch (error) {
      throw new Error(`WeChat 删除 API 错误: ${error}`);
    }
  }

  // ============================================================================
  // Mock 实现
  // ============================================================================

  private getMockAccessToken(): string {
    // 返回模拟的 token
    this.accessToken = `mock_token_${Date.now()}`;
    this.tokenExpireAt = Date.now() + 7200 * 1000; // 2小时有效期
    return this.accessToken;
  }

  private mockSaveDraft(article: DraftArticle): string {
    // 返回模拟的 media_id
    console.log(`[Mock] 保存草稿: ${article.title}`);
    return `mock_media_id_${Date.now()}`;
  }

  private mockPublishArticle(
    article: DraftArticle,
    options: PublishOptions
  ): string {
    // 返回模拟的 msg_id
    console.log(
      `[Mock] 发布文章: ${article.title}${options.publish_time ? ` (定时: ${new Date(options.publish_time * 1000).toISOString()})` : ''}`
    );
    return `mock_msg_id_${Date.now()}`;
  }

  private mockGetPublishHistory(limit: number): any[] {
    // 返回模拟的发布历史
    return Array.from({ length: limit }, (_, i) => ({
      article_id: `mock_article_${i}`,
      create_time: Date.now() / 1000 - 86400 * i,
      update_time: Date.now() / 1000 - 86400 * i,
      title: `Mock Article ${i}`,
      status: 2, // 已发布
    }));
  }
}

// ============================================================================
// 全局 WeChat 客户端实例
// ============================================================================

let wechatClient: WechatClient | null = null;

/**
 * 初始化微信API客户端
 */
export async function initWechatClient(
  config: WechatConfig,
  mockMode: boolean = true
): Promise<void> {
  if (!mockMode && (!config.appId.trim() || !config.appSecret.trim())) {
    throw new Error('WECHAT_APP_ID and WECHAT_APP_SECRET are required in real mode');
  }

  wechatClient = new WechatClient(config, mockMode);
  console.log(
    `✓ WeChat 客户端已初始化${mockMode ? ' (Mock 模式)' : ''}`
  );
}

/**
 * 获取已初始化的客户端
 */
function getClient(): WechatClient {
  if (!wechatClient) {
    throw new Error(
      'WeChat 客户端未初始化，请先调用 initWechatClient'
    );
  }
  return wechatClient;
}

/**
 * 获取Access Token
 */
export async function getAccessToken(): Promise<string> {
  return getClient().getAccessToken();
}

/**
 * 保存为草稿
 */
export async function saveDraft(article: DraftArticle): Promise<string> {
  return getClient().saveDraft(article);
}

/**
 * 发布文章
 */
export async function publishArticle(
  article: DraftArticle,
  options?: PublishOptions
): Promise<string> {
  return getClient().publishArticle(article, options);
}

/**
 * 获取发布记录
 */
export async function getPublishHistory(limit?: number): Promise<any[]> {
  return getClient().getPublishHistory(limit);
}

/**
 * 删除已发布的文章
 */
export async function deletePublished(msgId: string): Promise<boolean> {
  return getClient().deletePublished(msgId);
}

export default {
  initWechatClient,
  getAccessToken,
  saveDraft,
  publishArticle,
  getPublishHistory,
  deletePublished,
};
