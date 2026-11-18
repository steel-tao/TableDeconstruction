/**
 * @file src/services/publish/index.test.ts
 * @description 发布服务单元测试
 */

import { v4 as uuidv4 } from 'uuid';
import {
  createPublishRecord,
  PublishRecord,
  PublishStatus,
} from './index';

// Mock WeChat service
jest.mock('../wechat/index', () => ({
  wechatClient: {
    isInitialized: () => true,
    getAccessToken: jest.fn().mockResolvedValue('mock_token_12345'),
    saveDraft: jest.fn().mockResolvedValue('mock_media_id_123'),
    publishArticle: jest.fn().mockResolvedValue('mock_msg_id_456'),
    getPublishHistory: jest.fn().mockResolvedValue([]),
  },
  initializeWechatService: jest.fn().mockResolvedValue(undefined),
}));

describe('PublishService', () => {
  beforeEach(() => {
    // 测试前的初始化
    jest.clearAllMocks();
  });

  describe('createPublishRecord', () => {
    it('应该创建新的发布记录', async () => {
      const record = await createPublishRecord(
        '测试标题',
        '<p>测试内容</p>',
        'test-user'
      );

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.title).toBe('测试标题');
      expect(record.content).toBe('<p>测试内容</p>');
      expect(record.status).toBe(PublishStatus.DRAFT);
      expect(record.creator).toBe('test-user');
      expect(record.createdAt).toBeInstanceOf(Date);
    });

    it('应该生成唯一的记录 ID', async () => {
      const record1 = await createPublishRecord('标题1', '内容1');
      const record2 = await createPublishRecord('标题2', '内容2');

      expect(record1.id).not.toBe(record2.id);
    });

    it('应该设置正确的初始状态', async () => {
      const record = await createPublishRecord('标题', '内容');

      expect(record.status).toBe(PublishStatus.DRAFT);
      expect(record.publishedAt).toBeUndefined();
      expect(record.wechatMsgId).toBeUndefined();
    });

    it('应该支持可选的文件路径', async () => {
      const record = await createPublishRecord(
        '标题',
        '内容',
        undefined,
        '/path/to/file.md'
      );

      expect(record.filePath).toBe('/path/to/file.md');
    });
  });

  describe('发布流程状态转换', () => {
    let testRecord: PublishRecord;

    beforeEach(async () => {
      testRecord = await createPublishRecord(
        '工作流测试',
        '<p>测试内容</p>',
        'tester'
      );
    });

    it('draft -> pending_review 转换', async () => {
      expect(testRecord.status).toBe(PublishStatus.DRAFT);

      // 记录状态可以被修改
      testRecord.status = PublishStatus.PENDING_REVIEW;
      expect(testRecord.status).toBe(PublishStatus.PENDING_REVIEW);
    });

    it('应该维护创建时间戳', async () => {
      const originalCreatedAt = testRecord.createdAt.getTime();

      // 更新记录
      testRecord.status = PublishStatus.PENDING_REVIEW;
      testRecord.updatedAt = new Date();

      expect(testRecord.createdAt.getTime()).toBe(originalCreatedAt);
      expect(testRecord.updatedAt.getTime()).toBeGreaterThanOrEqual(originalCreatedAt);
    });
  });

  describe('记录存储', () => {
    it('应该创建并返回新记录', async () => {
      const record = await createPublishRecord('标题', '内容');

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.title).toBe('标题');
    });

    it('应该支持创建多条记录', async () => {
      const record1 = await createPublishRecord(
        '标题1',
        '内容1',
        'user1'
      );
      const record2 = await createPublishRecord(
        '标题2',
        '内容2',
        'user2'
      );

      expect(record1.id).not.toBe(record2.id);
      expect(record1.creator).toBe('user1');
      expect(record2.creator).toBe('user2');
    });

    it('应该生成唯一的 ID', async () => {
      const records = [];
      for (let i = 0; i < 3; i++) {
        const record = await createPublishRecord(`标题${i}`, '内容');
        records.push(record);
      }

      const ids = records.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('统计功能', () => {
    it('应该支持不同状态的记录', async () => {
      // 创建不同状态的记录
      const records = [];
      const statuses = [
        PublishStatus.DRAFT,
        PublishStatus.PENDING_REVIEW,
        PublishStatus.APPROVED,
        PublishStatus.PUBLISHED,
      ];

      for (const status of statuses) {
        const record = await createPublishRecord(`标题-${status}`, '内容');
        record.status = status;
        records.push(record);
      }

      expect(records.length).toBe(4);
      records.forEach((record, index) => {
        expect(record.status).toBe(statuses[index]);
      });
    });

    it('记录应该有定义的统计字段', async () => {
      const record = await createPublishRecord('标题', '内容');

      expect(record.stats).toBeDefined();
      expect(typeof record.stats?.views).toBe('number');
      expect(typeof record.stats?.likes).toBe('number');
      expect(typeof record.stats?.shares).toBe('number');
    });
  });

  describe('数据验证', () => {
    it('标题不能为空', async () => {
      await expect(createPublishRecord('', '内容')).rejects.toThrow('文章标题不能为空');
    });

    it('内容不能为空', async () => {
      await expect(createPublishRecord('标题', '')).rejects.toThrow('文章内容不能为空');
    });

    it('应该接受有效的 HTML 内容', async () => {
      const record = await createPublishRecord(
        '标题',
        '<div><p>有效的 HTML</p></div>'
      );

      expect(record.content).toContain('有效的 HTML');
    });
  });

  describe('元数据管理', () => {
    it('应该记录创建者信息', async () => {
      const record = await createPublishRecord(
        '标题',
        '内容',
        'alice@example.com'
      );

      expect(record.creator).toBe('alice@example.com');
    });

    it('应该支持记录统计字段', async () => {
      const record = await createPublishRecord('标题', '内容');

      expect(record.stats).toBeDefined();
      expect(record.stats?.views).toBe(0);
      expect(record.stats?.likes).toBe(0);
      expect(record.stats?.shares).toBe(0);
    });

    it('应该跟踪发布时间', async () => {
      const record = await createPublishRecord('标题', '内容');

      expect(record.publishedAt).toBeUndefined();

      // 模拟发布
      record.publishedAt = new Date();
      record.status = PublishStatus.PUBLISHED;

      expect(record.publishedAt).toBeInstanceOf(Date);
    });
  });
});
