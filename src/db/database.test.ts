import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DatabaseManager, getDatabase, initDatabase } from './database';

describe('DatabaseManager', () => {
  let tempDir: string;
  let manager: DatabaseManager;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'database-manager-'));
    manager = new DatabaseManager(path.join(tempDir, 'publish.sqlite'));
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates, retrieves, filters, updates and deletes publish records', () => {
    const draft = manager.createPublishRecord('Draft', 'draft content', 'author');
    const published = manager.createPublishRecord('Published', 'content');

    expect(manager.getPublishRecord(draft.id)?.title).toBe('Draft');
    expect(manager.getPublishRecord('missing')).toBeNull();
    expect(manager.listPublishRecords()).toHaveLength(2);
    expect(manager.listPublishRecords('draft', 1)).toHaveLength(1);

    const updated = manager.updatePublishRecord(draft.id, {
      status: 'published',
      reviewer: 'reviewer',
      review_comment: 'approved',
    });
    expect(updated.status).toBe('published');
    expect(manager.countByStatus()).toEqual({ draft: 1, published: 1 });

    expect(manager.deletePublishRecord(published.id)).toBe(true);
    expect(manager.getPublishRecord(published.id)).toBeNull();
    expect(() => manager.deletePublishRecord(published.id)).toThrow('发布记录不存在');
    expect(() => manager.updatePublishRecord('missing', { title: 'No record' })).toThrow(
      '发布记录不存在'
    );
  });

  it('records and filters audit logs', () => {
    const record = manager.createPublishRecord('Audited', 'content');
    const logs = manager.listAuditLogs(record.id);

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('CREATE');
    expect(manager.getAuditLog(logs[0].id)?.target_id).toBe(record.id);
    expect(manager.getAuditLog('missing')).toBeNull();
    expect(manager.listAuditLogs('missing')).toEqual([]);
  });

  it('upserts, lists and deletes configuration values', () => {
    manager.setConfig('wechat', 'app_id', 'first');
    manager.setConfig('wechat', 'app_id', 'updated');
    manager.setConfig('server', 'port', '3000');

    expect(manager.getConfig('wechat', 'app_id')).toBe('updated');
    expect(manager.getConfig('wechat', 'missing')).toBeNull();
    expect(manager.getAllConfigs()).toHaveLength(2);
    expect(manager.getAllConfigs('wechat')).toHaveLength(1);
    expect(manager.deleteConfig('wechat', 'app_id')).toBe(true);
    expect(manager.getConfig('wechat', 'app_id')).toBeNull();
  });

  it('commits and rolls back transactions', () => {
    const committed = manager.transaction(() =>
      manager.createPublishRecord('Committed', 'content')
    );
    expect(manager.getPublishRecord(committed.id)).not.toBeNull();

    expect(() => manager.transaction(() => {
      manager.createPublishRecord('Rolled back', 'content');
      throw new Error('rollback');
    })).toThrow('rollback');
    expect(manager.listPublishRecords()).toHaveLength(1);
  });

  it('executes SQL with and without parameters', () => {
    manager.exec('CREATE TABLE test_values (value TEXT NOT NULL)');
    manager.exec("INSERT INTO test_values (value) VALUES ('one')");

    expect(manager.query<{ value: string }>('SELECT value FROM test_values')).toEqual([
      { value: 'one' },
    ]);
    expect(manager.query<{ value: string }>(
      'SELECT value FROM test_values WHERE value = ?',
      ['one']
    )).toEqual([{ value: 'one' }]);
  });

  it('throws when the global database has not been initialized', () => {
    expect(() => getDatabase()).toThrow('数据库未初始化');
  });

  it('initializes and returns the global database instance', async () => {
    const globalPath = path.join(tempDir, 'global.sqlite');
    const globalManager = await initDatabase(globalPath);

    expect(getDatabase()).toBe(globalManager);
    await globalManager.close();
  });
});