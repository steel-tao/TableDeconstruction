/**
 * @file src/db/init.ts
 * @description 数据库初始化
 */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';

/**
 * 初始化数据库
 */
export async function initializeDatabase(dbPath: string): Promise<void> {
  // TODO: 实现数据库初始化
  // 1. 创建数据库连接
  // 2. 创建表结构
  // 3. 插入初始数据
  console.log('Initializing database at:', dbPath);
}

/**
 * 创建表
 */
async function createTables(db: sqlite3.Database): Promise<void> {
  // 文章表
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      author TEXT,
      category TEXT,
      tags TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      source_path TEXT
    )
  `);

  // 发布记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS publish_records (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      reviewer TEXT,
      review_comment TEXT,
      wechat_msg_id TEXT
    )
  `);

  // 配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS configs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 审计日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      operator TEXT,
      target_id TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      result TEXT,
      error TEXT
    )
  `);
}

export default {
  initializeDatabase,
};
