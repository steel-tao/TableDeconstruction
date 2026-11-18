/**
 * @file src/services/publish/index.ts
 * @description 发布流程管理 - 负责文章从创建到发布的完整生命周期
 */

import { v4 as uuidv4 } from 'uuid';
import * as WechatService from '../wechat/index.js';

// ============================================================================
// 类型定义
// ============================================================================

export enum PublishStatus {
  DRAFT = 'draft', // 草稿
  PENDING_REVIEW = 'pending_review', // 待审核
  APPROVED = 'approved', // 已审核通过
  PUBLISHED = 'published', // 已发布
  FAILED = 'failed', // 发布失败
  SCHEDULED = 'scheduled', // 定时发布
}

export interface PublishStats {
  // 阅读数
  views: number;
  // 点赞数
  likes: number;
  // 分享数
  shares: number;
  // 最后更新时间
  lastUpdated: Date;
}

export interface PublishRecord {
  // 记录 ID
  id: string;
  // 文章标题
  title: string;
  // 文章内容（Markdown）
  content: string;
  // 发布状态
  status: PublishStatus;
  // 创建时间
  createdAt: Date;
  // 更新时间
  updatedAt: Date;
  // 发布时间
  publishedAt?: Date;
  // 审核人员
  reviewer?: string;
  // 审核意见
  reviewComment?: string;
  // 微信 msg_id（发布后才有）
  wechatMsgId?: string;
  // 发布统计
  stats?: PublishStats;
  // 文件路径（从 Obsidian 导入）
  filePath?: string;
  // 创建人
  creator?: string;
  // 目标发布时间（定时发布）
  scheduledTime?: Date;
}

// ============================================================================
// 发布记录存储（内存 + 文件）
// ============================================================================

class PublishRecordStore {
  private records: Map<string, PublishRecord> = new Map();

  /**
   * 创建新记录
   */
  createRecord(
    title: string,
    content: string,
    creator?: string,
    filePath?: string
  ): PublishRecord {
    const record: PublishRecord = {
      id: uuidv4(),
      title,
      content,
      status: PublishStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator,
      filePath,
      stats: {
        views: 0,
        likes: 0,
        shares: 0,
        lastUpdated: new Date(),
      },
    };

    this.records.set(record.id, record);
    console.log(`✓ 创建发布记录: ${record.id} (${title})`);
    return record;
  }

  /**
   * 获取记录
   */
  getRecord(id: string): PublishRecord | null {
    return this.records.get(id) || null;
  }

  /**
   * 更新记录
   */
  updateRecord(id: string, partial: Partial<PublishRecord>): PublishRecord | null {
    const record = this.records.get(id);
    if (!record) return null;

    const updated = { ...record, ...partial, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  /**
   * 删除记录
   */
  deleteRecord(id: string): boolean {
    return this.records.delete(id);
  }

  /**
   * 列表查询
   */
  listRecords(
    status?: PublishStatus,
    limit: number = 20,
    offset: number = 0
  ): PublishRecord[] {
    let records = Array.from(this.records.values());

    if (status) {
      records = records.filter(r => r.status === status);
    }

    // 按更新时间倒序
    records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return records.slice(offset, offset + limit);
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<PublishStatus, number> {
    const counts: Record<PublishStatus, number> = {
      [PublishStatus.DRAFT]: 0,
      [PublishStatus.PENDING_REVIEW]: 0,
      [PublishStatus.APPROVED]: 0,
      [PublishStatus.PUBLISHED]: 0,
      [PublishStatus.FAILED]: 0,
      [PublishStatus.SCHEDULED]: 0,
    };

    for (const record of this.records.values()) {
      counts[record.status]++;
    }

    return counts;
  }
}

// ============================================================================
// 发布流程管理器
// ============================================================================

class PublishManager {
  private store: PublishRecordStore;

  constructor() {
    this.store = new PublishRecordStore();
  }

  /**
   * 创建发布记录
   */
  async createPublishRecord(
    title: string,
    content: string,
    creator?: string,
    filePath?: string
  ): Promise<PublishRecord> {
    if (!title.trim()) {
      throw new Error('文章标题不能为空');
    }
    if (!content.trim()) {
      throw new Error('文章内容不能为空');
    }

    return this.store.createRecord(title, content, creator, filePath);
  }

  /**
   * 提交审核（从 Doocs 获取 HTML 转换为 Markdown）
   */
  async submitForReview(
    recordId: string,
    htmlContent: string
  ): Promise<PublishRecord | null> {
    const record = this.store.getRecord(recordId);
    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    // 更新为待审核状态
    const updated = this.store.updateRecord(recordId, {
      status: PublishStatus.PENDING_REVIEW,
      content: htmlContent,
    });

    console.log(`✓ 已提交审核: ${recordId}`);
    return updated;
  }

  /**
   * 审核通过
   */
  async approvePublish(
    recordId: string,
    reviewer: string,
    comment?: string
  ): Promise<PublishRecord | null> {
    const record = this.store.getRecord(recordId);
    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    if (record.status !== PublishStatus.PENDING_REVIEW) {
      throw new Error(`只有待审核的文章才能通过审核`);
    }

    const updated = this.store.updateRecord(recordId, {
      status: PublishStatus.APPROVED,
      reviewer,
      reviewComment: comment,
    });

    console.log(`✓ 已批准发布: ${recordId}`);
    return updated;
  }

  /**
   * 拒绝发布
   */
  async rejectPublish(
    recordId: string,
    reviewer: string,
    reason: string
  ): Promise<PublishRecord | null> {
    const record = this.store.getRecord(recordId);
    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    const updated = this.store.updateRecord(recordId, {
      status: PublishStatus.DRAFT, // 改回草稿，可重新编辑
      reviewer,
      reviewComment: `拒绝理由: ${reason}`,
    });

    console.log(`✓ 已拒绝发布: ${recordId}`);
    return updated;
  }

  /**
   * 执行发布（发送到微信）
   */
  async executePublish(
    recordId: string,
    scheduledTime?: Date
  ): Promise<PublishRecord | null> {
    const record = this.store.getRecord(recordId);
    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    // 检查状态：要么是已批准，要么是草稿（直接发布）
    if (
      record.status !== PublishStatus.APPROVED &&
      record.status !== PublishStatus.DRAFT
    ) {
      throw new Error(
        `只有草稿或已批准的文章才能发布，当前状态: ${record.status}`
      );
    }

    try {
      // 准备文章数据
      const article: WechatService.DraftArticle = {
        title: record.title,
        content: record.content,
        author: record.creator || 'Unknown',
        digest: this.generateDigest(record.content),
      };

      // 发送到微信
      const msgId = await WechatService.publishArticle(article, {
        publish_time: scheduledTime ? Math.floor(scheduledTime.getTime() / 1000) : 0,
      });

      // 更新记录
      const updated = this.store.updateRecord(recordId, {
        status: scheduledTime ? PublishStatus.SCHEDULED : PublishStatus.PUBLISHED,
        wechatMsgId: msgId,
        publishedAt: scheduledTime || new Date(),
      });

      console.log(
        `✓ 已发布到微信: ${recordId} (msgId: ${msgId})`
      );
      return updated;
    } catch (error) {
      // 发布失败，更新状态
      const updated = this.store.updateRecord(recordId, {
        status: PublishStatus.FAILED,
        reviewComment: `发布失败: ${error}`,
      });

      console.error(`✗ 发布失败: ${recordId}`, error);
      return updated;
    }
  }

  /**
   * 获取发布记录
   */
  async getPublishRecord(recordId: string): Promise<PublishRecord | null> {
    return this.store.getRecord(recordId);
  }

  /**
   * 列表查询
   */
  async listPublishRecords(
    status?: PublishStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<PublishRecord[]> {
    return this.store.listRecords(status, limit, offset);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<Record<PublishStatus, number>> {
    return this.store.countByStatus();
  }

  /**
   * 生成摘要（从内容中提取前 100 字）
   */
  private generateDigest(content: string): string {
    // 移除 HTML 标签
    const text = content.replace(/<[^>]*>/g, '').trim();
    // 取前 100 字
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }
}

// ============================================================================
// 全局发布管理器实例
// ============================================================================

let publishManager: PublishManager | null = null;

/**
 * 初始化发布管理器
 */
export function initPublishManager(): void {
  publishManager = new PublishManager();
  console.log('✓ 发布管理器已初始化');
}

/**
 * 获取发布管理器
 */
function getManager(): PublishManager {
  if (!publishManager) {
    initPublishManager();
  }
  return publishManager!;
}

/**
 * 创建发布记录
 */
export async function createPublishRecord(
  title: string,
  content: string,
  creator?: string,
  filePath?: string
): Promise<PublishRecord> {
  return getManager().createPublishRecord(title, content, creator, filePath);
}

/**
 * 提交审核
 */
export async function submitForReview(
  recordId: string,
  htmlContent: string
): Promise<PublishRecord | null> {
  return getManager().submitForReview(recordId, htmlContent);
}

/**
 * 审核通过
 */
export async function approvePublish(
  recordId: string,
  reviewer: string,
  comment?: string
): Promise<PublishRecord | null> {
  return getManager().approvePublish(recordId, reviewer, comment);
}

/**
 * 拒绝发布
 */
export async function rejectPublish(
  recordId: string,
  reviewer: string,
  reason: string
): Promise<PublishRecord | null> {
  return getManager().rejectPublish(recordId, reviewer, reason);
}

/**
 * 执行发布
 */
export async function executePublish(
  recordId: string,
  scheduledTime?: Date
): Promise<PublishRecord | null> {
  return getManager().executePublish(recordId, scheduledTime);
}

/**
 * 获取发布记录
 */
export async function getPublishRecord(recordId: string): Promise<PublishRecord | null> {
  return getManager().getPublishRecord(recordId);
}

/**
 * 列出发布记录
 */
export async function listPublishRecords(
  status?: PublishStatus,
  limit?: number,
  offset?: number
): Promise<PublishRecord[]> {
  return getManager().listPublishRecords(status, limit, offset);
}

/**
 * 获取统计信息
 */
export async function getPublishStats(): Promise<Record<PublishStatus, number>> {
  return getManager().getStats();
}

export default {
  PublishStatus,
  initPublishManager,
  createPublishRecord,
  submitForReview,
  approvePublish,
  rejectPublish,
  executePublish,
  getPublishRecord,
  listPublishRecords,
  getPublishStats,
};
