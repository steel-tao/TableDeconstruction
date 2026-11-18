/**
 * @file src/services/publish/db-manager.ts
 * @description 数据库驱动的发布管理器 - 完全替代内存存储
 */

import * as WechatService from '../wechat/index';
import { getDatabase, PublishRecordDB } from '../../db/database';

// ============================================================================
// 类型定义（与原 index.ts 相同）
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
  views: number;
  likes: number;
  shares: number;
  lastUpdated: Date;
}

export interface PublishRecord {
  id: string;
  title: string;
  content: string;
  status: PublishStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  reviewer?: string;
  reviewComment?: string;
  wechatMsgId?: string;
  stats?: PublishStats;
  filePath?: string;
  creator?: string;
  scheduledTime?: Date;
}

// ============================================================================
// 转换函数
// ============================================================================

/**
 * 将数据库记录转换为 PublishRecord
 */
function dbToPublishRecord(dbRecord: PublishRecordDB): PublishRecord {
  return {
    id: dbRecord.id,
    title: dbRecord.title,
    content: dbRecord.content,
    status: dbRecord.status as PublishStatus,
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
    publishedAt: dbRecord.published_at ? new Date(dbRecord.published_at) : undefined,
    reviewer: dbRecord.reviewer,
    reviewComment: dbRecord.review_comment,
    wechatMsgId: dbRecord.wechat_msg_id,
    filePath: dbRecord.file_path,
    creator: dbRecord.creator,
    scheduledTime: dbRecord.scheduled_time ? new Date(dbRecord.scheduled_time) : undefined,
    stats: {
      views: 0,
      likes: 0,
      shares: 0,
      lastUpdated: new Date(dbRecord.updated_at),
    },
  };
}

/**
 * 将 PublishRecord 转换为数据库记录
 */
function publishRecordToDb(record: PublishRecord): Partial<PublishRecordDB> {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    status: record.status,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    published_at: record.publishedAt?.toISOString(),
    reviewer: record.reviewer,
    review_comment: record.reviewComment,
    wechat_msg_id: record.wechatMsgId,
    file_path: record.filePath,
    creator: record.creator,
    scheduled_time: record.scheduledTime?.toISOString(),
  };
}

// ============================================================================
// 数据库驱动的发布管理器
// ============================================================================

export class PublishManager {
  /**
   * 创建发布记录
   */
  async createPublishRecord(
    title: string,
    content: string,
    creator?: string,
    filePath?: string
  ): Promise<PublishRecord> {
    const db = getDatabase();
    const dbRecord = db.createPublishRecord(title, content, creator, filePath);
    console.log(`✓ 创建发布记录: ${dbRecord.id} (${title})`);
    return dbToPublishRecord(dbRecord);
  }

  /**
   * 提交审核
   */
  async submitForReview(
    recordId: string,
    htmlContent: string
  ): Promise<PublishRecord | null> {
    const db = getDatabase();
    const record = db.getPublishRecord(recordId);

    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    const updated = db.updatePublishRecord(recordId, {
      status: PublishStatus.PENDING_REVIEW,
      content: htmlContent,
    });

    console.log(`✓ 已提交审核: ${recordId}`);
    return dbToPublishRecord(updated);
  }

  /**
   * 审核通过
   */
  async approvePublish(
    recordId: string,
    reviewer: string,
    comment?: string
  ): Promise<PublishRecord | null> {
    const db = getDatabase();
    const record = db.getPublishRecord(recordId);

    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    if (record.status !== PublishStatus.PENDING_REVIEW) {
      throw new Error(`只有待审核的文章才能通过审核`);
    }

    const updated = db.updatePublishRecord(recordId, {
      status: PublishStatus.APPROVED,
      reviewer,
      review_comment: comment,
    });

    console.log(`✓ 已批准发布: ${recordId}`);
    return dbToPublishRecord(updated);
  }

  /**
   * 拒绝发布
   */
  async rejectPublish(
    recordId: string,
    reviewer: string,
    reason: string
  ): Promise<PublishRecord | null> {
    const db = getDatabase();
    const record = db.getPublishRecord(recordId);

    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

    const updated = db.updatePublishRecord(recordId, {
      status: PublishStatus.DRAFT,
      reviewer,
      review_comment: `拒绝理由: ${reason}`,
    });

    console.log(`✓ 已拒绝发布: ${recordId}`);
    return dbToPublishRecord(updated);
  }

  /**
   * 执行发布
   */
  async executePublish(
    recordId: string,
    scheduledTime?: Date
  ): Promise<PublishRecord | null> {
    const db = getDatabase();
    const record = db.getPublishRecord(recordId);

    if (!record) {
      throw new Error(`发布记录不存在: ${recordId}`);
    }

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
      const updated = db.updatePublishRecord(recordId, {
        status: scheduledTime ? PublishStatus.SCHEDULED : PublishStatus.PUBLISHED,
        wechat_msg_id: msgId,
        published_at: (scheduledTime || new Date()).toISOString(),
      });

      console.log(`✓ 已发布到微信: ${recordId} (msgId: ${msgId})`);
      return dbToPublishRecord(updated);
    } catch (error) {
      // 发布失败，更新状态
      const updated = db.updatePublishRecord(recordId, {
        status: PublishStatus.FAILED,
        review_comment: `发布失败: ${error}`,
      });

      console.error(`✗ 发布失败: ${recordId}`, error);
      return dbToPublishRecord(updated);
    }
  }

  /**
   * 获取发布记录
   */
  async getPublishRecord(recordId: string): Promise<PublishRecord | null> {
    const db = getDatabase();
    const record = db.getPublishRecord(recordId);
    return record ? dbToPublishRecord(record) : null;
  }

  /**
   * 列表查询
   */
  async listPublishRecords(
    status?: PublishStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<PublishRecord[]> {
    const db = getDatabase();
    const records = db.listPublishRecords(status, limit, offset);
    return records.map(dbToPublishRecord);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<Record<string, number>> {
    const db = getDatabase();
    return db.countByStatus();
  }

  /**
   * 删除发布记录
   */
  async deletePublishRecord(recordId: string): Promise<boolean> {
    const db = getDatabase();
    return db.deletePublishRecord(recordId);
  }

  /**
   * 获取审计日志
   */
  async getAuditLog(recordId: string, limit: number = 20): Promise<any[]> {
    const db = getDatabase();
    return db.listAuditLogs(recordId, limit, 0);
  }

  /**
   * 生成摘要
   */
  private generateDigest(content: string): string {
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }
}

// ============================================================================
// 全局发布管理器
// ============================================================================

let publishManager: PublishManager | null = null;

/**
 * 初始化发布管理器
 */
export function initPublishManager(): void {
  publishManager = new PublishManager();
  console.log('✓ 数据库驱动的发布管理器已初始化');
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
export async function getPublishStats(): Promise<Record<string, number>> {
  return getManager().getStats();
}

/**
 * 删除发布记录
 */
export async function deletePublishRecord(recordId: string): Promise<boolean> {
  return getManager().deletePublishRecord(recordId);
}

/**
 * 获取审计日志
 */
export async function getAuditLog(recordId: string, limit?: number): Promise<any[]> {
  return getManager().getAuditLog(recordId, limit);
}

export default {
  PublishStatus,
  PublishManager,
  initPublishManager,
  createPublishRecord,
  submitForReview,
  approvePublish,
  rejectPublish,
  executePublish,
  getPublishRecord,
  listPublishRecords,
  getPublishStats,
  deletePublishRecord,
  getAuditLog,
};
