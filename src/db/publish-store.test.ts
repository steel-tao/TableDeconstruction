/**
 * @file src/db/publish-store.test.ts
 * @description 发布记录存储单元测试
 */

import path from 'path';
import * as fs from 'fs';
import { PublishStore } from './publish-store';
import { PublishRecord, PublishStatus } from '../services/publish/index';

describe('PublishStore', () => {
  let store: PublishStore;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(__dirname, '../../test-db.sqlite');
    store = new PublishStore({ dbPath: testDbPath });
  });

  afterEach(() => {
    store.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('createRecord', () => {
    it('应该创建新的发布记录', () => {
      const record: PublishRecord = {
        id: 'rec_test_001',
        title: '测试文章',
        content: '<p>测试内容</p>',
        status: PublishStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: 'test-user',
      };

      const created = store.createRecord(record);
      expect(created.id).toBe('rec_test_001');
      expect(created.title).toBe('测试文章');
      expect(created.status).toBe(PublishStatus.DRAFT);
    });

    it('应该设置正确的时间戳', () => {
      const now = new Date();
      const record: PublishRecord = {
        id: 'rec_test_002',
        title: '时间戳测试',
        content: '内容',
        status: PublishStatus.DRAFT,
        createdAt: now,
        updatedAt: now,
      };

      const created = store.createRecord(record);
      expect(created.createdAt.getTime()).toBeCloseTo(now.getTime(), -2);
    });
  });

  describe('getRecord', () => {
    beforeEach(() => {
      const record: PublishRecord = {
        id: 'rec_test_get',
        title: '获取测试',
        content: '测试内容',
        status: PublishStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.createRecord(record);
    });

    it('应该获取已存在的记录', () => {
      const record = store.getRecord('rec_test_get');
      expect(record).not.toBeNull();
      expect(record?.title).toBe('获取测试');
    });

    it('不存在的记录应返回 null', () => {
      const record = store.getRecord('non_existent_id');
      expect(record).toBeNull();
    });
  });

  describe('updateRecord', () => {
    beforeEach(() => {
      const record: PublishRecord = {
        id: 'rec_test_update',
        title: '原标题',
        content: '原内容',
        status: PublishStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.createRecord(record);
    });

    it('应该更新记录状态', () => {
      const updated = store.updateRecord('rec_test_update', {
        status: PublishStatus.PENDING_REVIEW,
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe(PublishStatus.PENDING_REVIEW);
    });

    it('应该更新记录内容', () => {
      const updated = store.updateRecord('rec_test_update', {
        title: '新标题',
        content: '新内容',
      });

      expect(updated?.title).toBe('新标题');
      expect(updated?.content).toBe('新内容');
    });

    it('不存在的记录更新应返回 null', () => {
      const updated = store.updateRecord('non_existent', {
        title: '新标题',
      });

      expect(updated).toBeNull();
    });

    it('应该更新 updatedAt 时间戳', () => {
      const before = store.getRecord('rec_test_update')!.updatedAt;
      
      // 等待 1ms 确保时间戳不同
      const delay = new Promise(resolve => setTimeout(resolve, 1));
      
      return delay.then(() => {
        const updated = store.updateRecord('rec_test_update', {
          title: '新标题',
        });

        expect(updated!.updatedAt.getTime()).toBeGreaterThan(before.getTime());
      });
    });
  });

  describe('deleteRecord', () => {
    beforeEach(() => {
      const record: PublishRecord = {
        id: 'rec_test_delete',
        title: '删除测试',
        content: '内容',
        status: PublishStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.createRecord(record);
    });

    it('应该删除记录', () => {
      const deleted = store.deleteRecord('rec_test_delete');
      expect(deleted).toBe(true);

      const retrieved = store.getRecord('rec_test_delete');
      expect(retrieved).toBeNull();
    });
  });

  describe('listRecords', () => {
    beforeEach(() => {
      const records: PublishRecord[] = [
        {
          id: 'rec_draft_1',
          title: '草稿 1',
          content: '内容',
          status: PublishStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rec_draft_2',
          title: '草稿 2',
          content: '内容',
          status: PublishStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rec_published',
          title: '已发布',
          content: '内容',
          status: PublishStatus.PUBLISHED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      records.forEach(r => store.createRecord(r));
    });

    it('应该列出所有记录', () => {
      const { records, total } = store.listRecords();
      expect(total).toBeGreaterThanOrEqual(3);
      expect(records.length).toBeGreaterThanOrEqual(3);
    });

    it('应该按状态过滤', () => {
      const { records, total } = store.listRecords(PublishStatus.DRAFT);
      expect(total).toBeGreaterThanOrEqual(2);
      records.forEach(r => {
        expect(r.status).toBe(PublishStatus.DRAFT);
      });
    });

    it('应该支持分页', () => {
      const { records: page1, total } = store.listRecords(undefined, 2, 0);
      expect(page1.length).toBeLessThanOrEqual(2);

      if (total > 2) {
        const { records: page2 } = store.listRecords(undefined, 2, 2);
        expect(page2.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('countByStatus', () => {
    it('应该统计各状态的记录数', () => {
      const counts = store.countByStatus();
      
      expect(typeof counts.draft).toBe('number');
      expect(typeof counts.pending_review).toBe('number');
      expect(typeof counts.approved).toBe('number');
      expect(typeof counts.published).toBe('number');
      expect(typeof counts.failed).toBe('number');
      expect(typeof counts.scheduled).toBe('number');
    });
  });

  describe('getAuditLogs', () => {
    beforeEach(() => {
      const record: PublishRecord = {
        id: 'rec_audit_test',
        title: '审计日志测试',
        content: '内容',
        status: PublishStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.createRecord(record);
    });

    it('应该记录状态变更', () => {
      store.updateRecord('rec_audit_test', {
        status: PublishStatus.APPROVED,
        reviewer: 'reviewer1',
      });

      const logs = store.getAuditLogs('rec_audit_test');
      expect(logs.length).toBeGreaterThanOrEqual(2); // created + status_changed
      
      const statusChangeLogs = logs.filter(l => l.action.includes('status'));
      expect(statusChangeLogs.length).toBeGreaterThan(0);
    });

    it('不存在的记录应返回空数组', () => {
      const logs = store.getAuditLogs('non_existent');
      expect(logs).toEqual([]);
    });
  });
});
