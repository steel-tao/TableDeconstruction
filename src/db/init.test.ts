import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDatabaseVersion, initializeDatabase } from './init';

describe('Database initialization', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-db-'));
    dbPath = path.join(tempDir, 'nested', 'publish.sqlite');
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the database, schema and all migrations', async () => {
    db = await initializeDatabase(dbPath);

    expect(fs.existsSync(dbPath)).toBe(true);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(getDatabaseVersion(db)).toBe(3);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all().map((row: any) => row.name);
    expect(tables).toEqual(expect.arrayContaining([
      'publish_records',
      'publish_audit_logs',
      'articles',
      'configs',
      'schema_migrations',
    ]));
  });

  it('does not reapply completed migrations', async () => {
    db = await initializeDatabase(dbPath);
    db.close();

    db = await initializeDatabase(dbPath);

    const result = db.prepare(
      'SELECT COUNT(*) AS count FROM schema_migrations'
    ).get() as { count: number };
    expect(result.count).toBe(3);
  });

  it('returns version zero when migration metadata is absent', () => {
    db = new Database(':memory:');

    expect(getDatabaseVersion(db)).toBe(0);
  });
});