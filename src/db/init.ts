/**
 * @file src/db/init.ts
 * @description 数据库初始化 - SQLite 表结构和迁移
 */

import Database from 'better-sqlite3';
import path from 'path';
import * as fs from 'fs';

/**
 * 初始化数据库
 */
export async function initializeDatabase(dbPath: string): Promise<Database.Database> {
  // 确保目录存在
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 创建或打开数据库
  const db = new Database(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');
  
  // 执行迁移
  await runMigrations(db);
  
  console.log(`✓ 数据库已初始化: ${dbPath}`);
  return db;
}

/**
 * 迁移系统
 */
interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_base_tables',
    up: (db: Database.Database) => {
      // 发布记录表
      db.exec(`
        CREATE TABLE IF NOT EXISTS publish_records (
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
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          shares INTEGER DEFAULT 0,
          stats_updated_at DATETIME
        )
      `);

      // 创建索引
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_publish_records_status 
        ON publish_records(status);
        
        CREATE INDEX IF NOT EXISTS idx_publish_records_created_at 
        ON publish_records(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_publish_records_wechat_msg_id 
        ON publish_records(wechat_msg_id);
      `);

      // 审核日志表
      db.exec(`
        CREATE TABLE IF NOT EXISTS publish_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          record_id TEXT NOT NULL,
          action TEXT NOT NULL,
          actor TEXT,
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (record_id) REFERENCES publish_records(id) ON DELETE CASCADE
        )
      `);

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id 
        ON publish_audit_logs(record_id);
      `);

      console.log('✓ 迁移 v1: 创建基础表');
    },
  },

  {
    version: 2,
    name: 'create_articles_table',
    up: (db: Database.Database) => {
      // 文章表
      db.exec(`
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

      console.log('✓ 迁移 v2: 创建文章表');
    },
  },

  {
    version: 3,
    name: 'create_config_table',
    up: (db: Database.Database) => {
      // 配置表
      db.exec(`
        CREATE TABLE IF NOT EXISTS configs (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(type, key)
        )
      `);

      console.log('✓ 迁移 v3: 创建配置表');
    },
  },
];

/**
 * 运行迁移
 */
async function runMigrations(db: Database.Database): Promise<void> {
  // 创建迁移记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 获取已执行的迁移
  const executed = db.prepare(`
    SELECT version FROM schema_migrations ORDER BY version
  `).all() as any[];
  const executedVersions = new Set(executed.map((row: any) => row.version));

  // 执行待处理的迁移
  for (const migration of migrations) {
    if (!executedVersions.has(migration.version)) {
      try {
        migration.up(db);
        db.prepare(`
          INSERT INTO schema_migrations (version, name) VALUES (?, ?)
        `).run(migration.version, migration.name);
        console.log(`✓ 执行迁移 v${migration.version}: ${migration.name}`);
      } catch (error) {
        console.error(`✗ 迁移 v${migration.version} 失败:`, error);
        throw error;
      }
    }
  }
}

/**
 * 获取数据库版本
 */
export function getDatabaseVersion(db: Database.Database): number {
  try {
    const result = db.prepare(`
      SELECT MAX(version) as version FROM schema_migrations
    `).get() as any;
    return result?.version || 0;
  } catch {
    return 0;
  }
}

export default {
  initializeDatabase,
  getDatabaseVersion,
};

