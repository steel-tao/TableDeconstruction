/**
 * @file src/db/database.ts
 * @description SQLite 数据库管理器 - 负责所有数据持久化
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// 类型定义
// ============================================================================

export interface PublishRecordDB {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  reviewer?: string;
  review_comment?: string;
  wechat_msg_id?: string;
  creator?: string;
  file_path?: string;
  scheduled_time?: string;
}

export interface AuditLogDB {
  id: string;
  action: string;
  operator?: string;
  target_id?: string;
  details?: string;
  timestamp: string;
  result: string;
  error?: string;
}

export interface ConfigDB {
  id: string;
  type: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 数据库管理器
// ============================================================================

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 打开数据库
      this.db = new Database(this.dbPath);
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');

      // 创建表
      this.createTables();

      console.log(`✓ 数据库已初始化: ${this.dbPath}`);
    } catch (error) {
      throw new Error(`数据库初始化失败: ${error}`);
    }
  }

  /**
   * 创建表结构
   */
  private createTables(): void {
    if (!this.db) throw new Error('数据库未初始化');

    // 发布记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS publish_records (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        creator TEXT,
        file_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        published_at TEXT,
        reviewer TEXT,
        review_comment TEXT,
        wechat_msg_id TEXT,
        scheduled_time TEXT
      )
    `);

    // 审计日志表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        operator TEXT,
        target_id TEXT,
        target_type TEXT,
        details TEXT,
        timestamp TEXT NOT NULL,
        result TEXT NOT NULL,
        error TEXT
      )
    `);

    // 配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS configs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(type, key)
      )
    `);

    // 创建索引以加快查询
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_publish_records_status ON publish_records(status);
      CREATE INDEX IF NOT EXISTS idx_publish_records_created_at ON publish_records(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);

    console.log('✓ 表结构已创建');
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('✓ 数据库已关闭');
    }
  }

  // ========================================================================
  // 发布记录操作
  // ========================================================================

  /**
   * 创建发布记录
   */
  createPublishRecord(
    title: string,
    content: string,
    creator?: string,
    filePath?: string
  ): PublishRecordDB {
    if (!this.db) throw new Error('数据库未初始化');

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO publish_records (
        id, title, content, status, creator, file_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, title, content, 'draft', creator, filePath, now, now);

    this.recordAuditLog('CREATE', creator, id, 'publish_record', {
      title,
      status: 'draft',
    });

    return this.getPublishRecord(id)!;
  }

  /**
   * 获取发布记录
   */
  getPublishRecord(id: string): PublishRecordDB | null {
    if (!this.db) throw new Error('数据库未初始化');

    const stmt = this.db.prepare(`
      SELECT * FROM publish_records WHERE id = ?
    `);

    return stmt.get(id) as PublishRecordDB | undefined || null;
  }

  /**
   * 列出发布记录
   */
  listPublishRecords(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): PublishRecordDB[] {
    if (!this.db) throw new Error('数据库未初始化');

    let query = 'SELECT * FROM publish_records';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as PublishRecordDB[];
  }

  /**
   * 更新发布记录
   */
  updatePublishRecord(id: string, partial: Partial<PublishRecordDB>): PublishRecordDB {
    if (!this.db) throw new Error('数据库未初始化');

    const record = this.getPublishRecord(id);
    if (!record) {
      throw new Error(`发布记录不存在: ${id}`);
    }

    const updated = {
      ...record,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    const fields = Object.keys(partial)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`);
    const values = Object.values(partial).filter((_, i) => Object.keys(partial)[i] !== 'id');
    values.push(updated.updated_at);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE publish_records SET ${fields.join(', ')}, updated_at = ? WHERE id = ?
    `);

    stmt.run(...values);

    this.recordAuditLog('UPDATE', partial.reviewer, id, 'publish_record', {
      status: partial.status,
      comment: partial.review_comment,
    });

    return this.getPublishRecord(id)!;
  }

  /**
   * 删除发布记录
   */
  deletePublishRecord(id: string): boolean {
    if (!this.db) throw new Error('数据库未初始化');

    const record = this.getPublishRecord(id);
    if (!record) {
      throw new Error(`发布记录不存在: ${id}`);
    }

    const stmt = this.db.prepare('DELETE FROM publish_records WHERE id = ?');
    stmt.run(id);

    this.recordAuditLog('DELETE', undefined, id, 'publish_record', {
      title: record.title,
      status: record.status,
    });

    return true;
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<string, number> {
    if (!this.db) throw new Error('数据库未初始化');

    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM publish_records GROUP BY status
    `);

    const rows = stmt.all() as Array<{ status: string; count: number }>;
    const result: Record<string, number> = {};

    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }

  // ========================================================================
  // 审计日志操作
  // ========================================================================

  /**
   * 记录审计日志
   */
  recordAuditLog(
    action: string,
    operator?: string,
    targetId?: string,
    targetType?: string,
    details?: Record<string, any>
  ): void {
    if (!this.db) throw new Error('数据库未初始化');

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        id, action, operator, target_id, target_type, details, timestamp, result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      action,
      operator,
      targetId,
      targetType,
      details ? JSON.stringify(details) : null,
      timestamp,
      'success'
    );
  }

  /**
   * 获取审计日志
   */
  getAuditLog(id: string): AuditLogDB | null {
    if (!this.db) throw new Error('数据库未初始化');

    const stmt = this.db.prepare('SELECT * FROM audit_logs WHERE id = ?');
    return (stmt.get(id) as AuditLogDB | undefined) || null;
  }

  /**
   * 列出审计日志
   */
  listAuditLogs(
    targetId?: string,
    limit: number = 50,
    offset: number = 0
  ): AuditLogDB[] {
    if (!this.db) throw new Error('数据库未初始化');

    let query = 'SELECT * FROM audit_logs';
    const params: any[] = [];

    if (targetId) {
      query += ' WHERE target_id = ?';
      params.push(targetId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as AuditLogDB[];
  }

  // ========================================================================
  // 配置操作
  // ========================================================================

  /**
   * 设置配置
   */
  setConfig(type: string, key: string, value: string): void {
    if (!this.db) throw new Error('数据库未初始化');

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO configs (id, type, key, value, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(type, key) DO UPDATE SET
        value = ?, updated_at = ?
    `);

    stmt.run(id, type, key, value, now, now, value, now);
  }

  /**
   * 获取配置
   */
  getConfig(type: string, key: string): string | null {
    if (!this.db) throw new Error('数据库未初始化');

    const stmt = this.db.prepare(`
      SELECT value FROM configs WHERE type = ? AND key = ?
    `);

    const result = stmt.get(type, key) as { value: string } | undefined;
    return result?.value || null;
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(type?: string): ConfigDB[] {
    if (!this.db) throw new Error('数据库未初始化');

    let query = 'SELECT * FROM configs';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as ConfigDB[];
  }

  /**
   * 删除配置
   */
  deleteConfig(type: string, key: string): boolean {
    if (!this.db) throw new Error('数据库未初始化');

    const stmt = this.db.prepare(`
      DELETE FROM configs WHERE type = ? AND key = ?
    `);

    stmt.run(type, key);
    return true;
  }

  // ========================================================================
  // 事务操作
  // ========================================================================

  /**
   * 执行事务
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('数据库未初始化');

    const transaction = this.db.transaction(fn);
    return transaction();
  }

  /**
   * 执行 SQL 查询
   */
  exec(sql: string): void {
    if (!this.db) throw new Error('数据库未初始化');
    this.db.exec(sql);
  }

  /**
   * 执行 SQL 查询并返回结果
   */
  query<T = any>(sql: string, params?: any[]): T[] {
    if (!this.db) throw new Error('数据库未初始化');
    const stmt = this.db.prepare(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  }
}

// ============================================================================
// 全局数据库实例
// ============================================================================

let database: DatabaseManager | null = null;

/**
 * 初始化全局数据库
 */
export async function initDatabase(dbPath: string): Promise<DatabaseManager> {
  database = new DatabaseManager(dbPath);
  await database.initialize();
  return database;
}

/**
 * 获取数据库实例
 */
export function getDatabase(): DatabaseManager {
  if (!database) {
    throw new Error('数据库未初始化，请先调用 initDatabase');
  }
  return database;
}

export default {
  DatabaseManager,
  initDatabase,
  getDatabase,
};
