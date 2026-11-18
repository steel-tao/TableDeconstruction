/**
 * @file src/services/wechat/adapter.ts
 * @description WeChat API 适配器架构 - 支持 Mock 和真实 API 的灵活切换
 * 
 * 这个文件提供了高度灵活的适配器模式，使得：
 * - 开发环境可以用 Mock 快速测试
 * - 测试环境可以验证真实 API
 * - 生产环境可以无缝切换
 * 
 * 使用方式：
 * 1. 配置 .env: WECHAT_ADAPTER=mock  或 real
 * 2. 自动加载对应的实现
 * 3. 业务代码无需改动
 */

import { WechatConfig, DraftArticle, PublishOptions } from './index';

// ============================================================================
// 适配器接口定义
// ============================================================================

export interface IWechatAdapter {
  /**
   * 初始化
   */
  init(config: WechatConfig): Promise<void>;

  /**
   * 获取 Access Token
   */
  getAccessToken(): Promise<string>;

  /**
   * 保存为草稿
   */
  saveDraft(article: DraftArticle): Promise<string>;

  /**
   * 发布文章
   */
  publishArticle(article: DraftArticle, options?: PublishOptions): Promise<string>;

  /**
   * 获取发布历史
   */
  getPublishHistory(limit: number): Promise<any[]>;

  /**
   * 删除已发布的文章
   */
  deletePublished(msgId: string): Promise<boolean>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// Mock 适配器实现
// ============================================================================

export class MockWechatAdapter implements IWechatAdapter {
  private config: WechatConfig | null = null;
  private mockToken: string = '';

  async init(config: WechatConfig): Promise<void> {
    this.config = config;
    this.mockToken = `mock_token_${Date.now()}`;
    console.log(
      `✓ Mock WeChat 适配器已初始化 (AppID: ${config.appId.substring(0, 5)}***)`
    );
  }

  async getAccessToken(): Promise<string> {
    console.log('[Mock] 返回模拟 Access Token');
    return this.mockToken;
  }

  async saveDraft(article: DraftArticle): Promise<string> {
    const mediaId = `mock_media_id_${Date.now()}`;
    console.log(`[Mock] 保存草稿: ${article.title} -> ${mediaId}`);
    return mediaId;
  }

  async publishArticle(
    article: DraftArticle,
    options?: PublishOptions
  ): Promise<string> {
    const msgId = `mock_msg_id_${Date.now()}`;
    console.log(
      `[Mock] 发布文章: ${article.title} -> ${msgId}${
        options?.publish_time ? ` (定时: ${new Date(options.publish_time * 1000).toISOString()})` : ''
      }`
    );
    return msgId;
  }

  async getPublishHistory(limit: number): Promise<any[]> {
    console.log(`[Mock] 获取发布历史 (limit: ${limit})`);
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      article_id: `mock_article_${i}`,
      create_time: Date.now() / 1000 - 86400 * i,
      title: `Mock Article ${i}`,
      status: 2,
    }));
  }

  async deletePublished(msgId: string): Promise<boolean> {
    console.log(`[Mock] 删除文章: ${msgId}`);
    return true;
  }

  async healthCheck(): Promise<boolean> {
    console.log('[Mock] 健康检查: OK');
    return true;
  }
}

// ============================================================================
// 真实 API 适配器实现
// ============================================================================

export class RealWechatAdapter implements IWechatAdapter {
  private config: WechatConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpireAt: number = 0;
  private readonly API_BASE = 'https://api.weixin.qq.com';

  async init(config: WechatConfig): Promise<void> {
    this.config = config;
    console.log(
      `✓ 真实 WeChat 适配器已初始化 (AppID: ${config.appId.substring(0, 5)}***)`
    );
    
    // 验证连接
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      console.warn('⚠️ WeChat API 连接检查失败，请检查网络和密钥');
    }
  }

  async getAccessToken(): Promise<string> {
    // 检查缓存是否仍有效
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }

    if (!this.config) {
      throw new Error('WeChat 适配器未初始化');
    }

    try {
      const response = await fetch(
        `${this.API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`
      );

      const data = await response.json() as any;

      if (data.errcode) {
        throw new Error(`获取 Access Token 失败: ${data.errmsg}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpireAt = Date.now() + (data.expires_in - 300) * 1000;

      console.log('✓ 已获取真实 Access Token');
      return this.accessToken;
    } catch (error) {
      throw new Error(`WeChat API 错误: ${error}`);
    }
  }

  async saveDraft(article: DraftArticle): Promise<string> {
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
      const response = await fetch(
        `${this.API_BASE}/cgi-bin/draft/add?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as any;

      if (data.errcode) {
        throw new Error(`保存草稿失败: ${data.errmsg}`);
      }

      console.log(`✓ 已保存草稿: ${article.title} -> ${data.media_id}`);
      return data.media_id;
    } catch (error) {
      throw new Error(`WeChat 草稿 API 错误: ${error}`);
    }
  }

  async publishArticle(
    article: DraftArticle,
    options?: PublishOptions
  ): Promise<string> {
    const token = await this.getAccessToken();
    
    // 先保存为草稿
    const mediaId = await this.saveDraft(article);

    const payload = {
      media_ids: [mediaId],
      publish_time: options?.publish_time || 0,
    };

    try {
      const response = await fetch(
        `${this.API_BASE}/cgi-bin/freepublish/submit?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as any;

      if (data.errcode) {
        throw new Error(`发布文章失败: ${data.errmsg}`);
      }

      console.log(`✓ 已发布文章: ${article.title} -> ${data.msg_id}`);
      return data.msg_id;
    } catch (error) {
      throw new Error(`WeChat 发布 API 错误: ${error}`);
    }
  }

  async getPublishHistory(limit: number): Promise<any[]> {
    const token = await this.getAccessToken();
    const payload = {
      type: 'news',
      begin: 0,
      count: limit,
    };

    try {
      const response = await fetch(
        `${this.API_BASE}/cgi-bin/freepublish/getarticleid?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as any;
      console.log(`✓ 已获取发布历史 (${data.item?.length || 0} 条)`);
      return data.item || [];
    } catch (error) {
      throw new Error(`WeChat 发布历史 API 错误: ${error}`);
    }
  }

  async deletePublished(msgId: string): Promise<boolean> {
    const token = await this.getAccessToken();
    const payload = { article_id: msgId };

    try {
      const response = await fetch(
        `${this.API_BASE}/cgi-bin/freepublish/delete?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as any;
      console.log(`✓ 已删除文章: ${msgId}`);
      return !data.errcode;
    } catch (error) {
      throw new Error(`WeChat 删除 API 错误: ${error}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.config) return false;
      
      // 尝试获取 Access Token 来验证配置
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }
}

// ============================================================================
// 适配器工厂
// ============================================================================

export class WechatAdapterFactory {
  /**
   * 创建适配器实例
   * @param adapterType 'mock' 或 'real'
   */
  static createAdapter(adapterType: string = 'mock'): IWechatAdapter {
    if (adapterType === 'real') {
      console.log('🔌 使用真实 WeChat API 适配器');
      return new RealWechatAdapter();
    }

    console.log('🎭 使用 Mock WeChat API 适配器（开发模式）');
    return new MockWechatAdapter();
  }

  /**
   * 从环境变量创建适配器
   */
  static createFromEnv(): IWechatAdapter {
    const adapterType = process.env.WECHAT_ADAPTER || 'mock';
    return this.createAdapter(adapterType);
  }
}
