/**
 * @file src/db/publish-store.ts
 * @description 发布记录数据库存储 - SQLite 实现
 */

import Database from 'better-sqlite3';
import path from 'path';
import { PublishRecord, PublishStatus } from '../services/publish/index.js';

export interface PublishStoreOptions {
  dbPath?: string;
  verbose?: boolean;
}

export class PublishStore {
  private db: Database.Database;
  private readonly TABLE_NAME = 'publish_records';

  constructor(options: PublishStoreOptions = {}) {
    const dbPath = options.dbPath || path.join(process.cwd(), 'data', 'publish.db');
    this.db = new Database(dbPath, { verbose: options.verbose ? console.log : undefined });
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON');
    
    this.initTables();
    console.log(`✓ 发布记录存储已初始化: ${dbPath}`);
  }

  /**
   * 初始化表结构
   */
  private initTables(): void {
    // 发布记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME,
        reviewer TEXT,
        review_comment TEXT,
        wechat_msg_id TEXT,
        file_path TEXT,
        creator TEXT,
        scheduled_time DATETIME,
        
        -- 统计字段
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        stats_updated_at DATETIME
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_status ON ${this.TABLE_NAME}(status);
      CREATE INDEX IF NOT EXISTS idx_created_at ON ${this.TABLE_NAME}(created_at);
      CREATE INDEX IF NOT EXISTS idx_wechat_msg_id ON ${this.TABLE_NAME}(wechat_msg_id);
      CREATE INDEX IF NOT EXISTS idx_file_path ON ${this.TABLE_NAME}(file_path);
    `);

    // 审核日志表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS publish_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES ${this.TABLE_NAME}(id) ON DELETE CASCADE
      )
    `);

    // 创建审核日志索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_record_id ON publish_audit_logs(record_id);
      CREATE INDEX IF NOT EXISTS idx_action ON publish_audit_logs(action);
    `);
  }

  /**
   * 创建发布记录
   */
  createRecord(record: PublishRecord): PublishRecord {
    const stmt = this.db.prepare(`
      INSERT INTO ${this.TABLE_NAME} (
        id, title, content, status, created_at, updated_at, 
        creator, file_path, views, likes, shares, stats_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.title,
      record.content,
      record.status,
      record.createdAt.toISOString(),
      record.updatedAt.toISOString(),
      record.creator || null,
      record.filePath || null,
      record.stats?.views || 0,
      record.stats?.likes || 0,
      record.stats?.shares || 0,
      new Date().toISOString()
    );

    // 记录审核日志
    this.addAuditLog(record.id, 'created', null, `创建了发布记录: ${record.title}`);

    console.log(`✓ 已保存发布记录: ${record.id}`);
    return record;
  }

  /**
   * 获取记录
   */
  getRecord(id: string): PublishRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.TABLE_NAME} WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.rowToRecord(row);
  }

  /**
   * 更新记录
   */
  updateRecord(id: string, partial: Partial<PublishRecord>): PublishRecord | null {
    const existing = this.getRecord(id);
    if (!existing) return null;

    const updated = { ...existing, ...partial, updatedAt: new Date() };

    const updates: string[] = [];
    const values: any[] = [];

    if (partial.title !== undefined) {
      updates.push('title = ?');
      values.push(partial.title);
    }
    if (partial.status !== undefined) {
      updates.push('status = ?');
      values.push(partial.status);
    }
    if (partial.content !== undefined) {
      updates.push('content = ?');
      values.push(partial.content);
    }
    if (partial.reviewer !== undefined) {
      updates.push('reviewer = ?');
      values.push(partial.reviewer || null);
    }
    if (partial.reviewComment !== undefined) {
      updates.push('review_comment = ?');
      values.push(partial.reviewComment || null);
    }
    if (partial.wechatMsgId !== undefined) {
      updates.push('wechat_msg_id = ?');
      values.push(partial.wechatMsgId || null);
    }
    if (partial.publishedAt !== undefined) {
      updates.push('published_at = ?');
      values.push(partial.publishedAt ? partial.publishedAt.toISOString() : null);
    }
    if (partial.scheduledTime !== undefined) {
      updates.push('scheduled_time = ?');
      values.push(partial.scheduledTime ? partial.scheduledTime.toISOString() : null);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    const sql = `UPDATE ${this.TABLE_NAME} SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    // 记录审核日志
    if (partial.status) {
      this.addAuditLog(id, `status_changed_to_${partial.status}`, partial.reviewer || null, '');
    }

    console.log(`✓ 已更新发布记录: ${id}`);
    return this.getRecord(id);
  }

  /**
   * 删除记录
   */
  deleteRecord(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM ${this.TABLE_NAME} WHERE id = ?`);
    stmt.run(id);
    return true;
  }

  /**
   * 列表查询
   */
  listRecords(
    status?: PublishStatus,
    limit: number = 20,
    offset: number = 0
  ): { records: PublishRecord[]; total: number } {
    let where = '1=1';
    const params: any[] = [];

    if (status) {
      where = 'status = ?';
      params.push(status);
    }

    // 获取总数
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE ${where}
    `);
    const countRow = countStmt.get(...params) as any;
    const total = countRow.count;

    // 获取分页数据
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.TABLE_NAME} 
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as any[];
    const records = rows.map(row => this.rowToRecord(row));

    return { records, total };
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<PublishStatus, number> {
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM ${this.TABLE_NAME} GROUP BY status
    `);

    const rows = stmt.all() as any[];
    const counts: Record<PublishStatus, number> = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      published: 0,
      failed: 0,
      scheduled: 0,
    };

    for (const row of rows) {
      counts[row.status as PublishStatus] = row.count;
    }

    return counts;
  }

  /**
   * 获取审核日志
   */
  getAuditLogs(recordId: string): Array<{
    id: number;
    action: string;
    actor?: string;
    comment?: string;
    createdAt: Date;
  }> {
    const stmt = this.db.prepare(`
      SELECT * FROM publish_audit_logs WHERE record_id = ? ORDER BY created_at DESC
    `);

    const rows = stmt.all(recordId) as any[];
    return rows.map(row => ({
      id: row.id,
      action: row.action,
      actor: row.actor,
      comment: row.comment,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * 添加审核日志
   */
  private addAuditLog(
    recordId: string,
    action: string,
    actor: string | null,
    comment: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO publish_audit_logs (record_id, action, actor, comment)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(recordId, action, actor, comment);
  }

  /**
   * 数据库行转记录对象
   */
  private rowToRecord(row: any): PublishRecord {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      status: row.status as PublishStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      reviewer: row.reviewer || undefined,
      reviewComment: row.review_comment || undefined,
      wechatMsgId: row.wechat_msg_id || undefined,
      filePath: row.file_path || undefined,
      creator: row.creator || undefined,
      scheduledTime: row.scheduled_time ? new Date(row.scheduled_time) : undefined,
      stats: {
        views: row.views || 0,
        likes: row.likes || 0,
        shares: row.shares || 0,
        lastUpdated: row.stats_updated_at ? new Date(row.stats_updated_at) : new Date(),
      },
    };
  }

  /**
   * 关闭数据库
   */
  close(): void {
    this.db.close();
    console.log('✓ 数据库已关闭');
  }

  /**
   * 执行原始 SQL（仅用于高级操作）
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }
}

export default PublishStore;
