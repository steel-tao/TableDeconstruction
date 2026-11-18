/**
 * @file src/services/wechat/adapter.test.ts
 * @description WeChat 适配器单元测试（Mock 和 Real）
 */

import {
  WechatAdapterFactory,
  IWechatAdapter,
  MockWechatAdapter,
  RealWechatAdapter,
} from './adapter';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('WeChat Adapter Factory', () => {
  describe('createAdapter', () => {
    it('应该创建 Mock 适配器', () => {
      const adapter = WechatAdapterFactory.createAdapter('mock');

      expect(adapter).toBeDefined();
      expect(adapter instanceof MockWechatAdapter).toBe(true);
    });

    it('应该创建 Real 适配器', () => {
      const adapter = WechatAdapterFactory.createAdapter('real');

      expect(adapter).toBeDefined();
      expect(adapter instanceof RealWechatAdapter).toBe(true);
    });

    it('应该支持从环境变量创建', () => {
      process.env.WECHAT_ADAPTER = 'mock';
      const adapter = WechatAdapterFactory.createFromEnv();

      expect(adapter).toBeDefined();
    });
  });
});

describe('MockWechatAdapter', () => {
  let adapter: MockWechatAdapter;

  beforeEach(() => {
    adapter = new MockWechatAdapter();
  });

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      await adapter.init({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });

      expect(adapter).toBeDefined();
    });
  });

  describe('getAccessToken', () => {
    beforeEach(async () => {
      await adapter.init({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });
    });

    it('应该返回模拟 token', async () => {
      const token = await adapter.getAccessToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toContain('mock_token_');
    });

    it('应该缓存 token', async () => {
      const token1 = await adapter.getAccessToken();
      const token2 = await adapter.getAccessToken();

      expect(token1).toBe(token2);
    });
  });

  describe('saveDraft', () => {
    beforeEach(async () => {
      await adapter.init({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });
    });

    it('应该返回模拟 media_id', async () => {
      const mediaId = await adapter.saveDraft({
        title: 'Test Article',
        author: 'Test Author',
        digest: 'Test Digest',
        content: '<p>Test Content</p>',
      });

      expect(mediaId).toBeDefined();
      expect(typeof mediaId).toBe('string');
      expect(mediaId).toContain('mock_media_id_');
    });
  });

  describe('publishArticle', () => {
    beforeEach(async () => {
      await adapter.init({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });
    });

    it('应该返回模拟 msg_id', async () => {
      const msgId = await adapter.publishArticle({
        title: 'Test',
        author: 'Author',
        content: 'Content',
        digest: 'Digest',
      });

      expect(msgId).toBeDefined();
      expect(typeof msgId).toBe('string');
      expect(msgId).toContain('mock_msg_id_');
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await adapter.init({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });
    });

    it('应该返回健康状态', async () => {
      const result = await adapter.healthCheck();

      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });
  });
});

describe('RealWechatAdapter', () => {
  let adapter: RealWechatAdapter;

  beforeEach(() => {
    adapter = new RealWechatAdapter();
  });

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      jest.spyOn(adapter, 'healthCheck').mockResolvedValue(true);
      await adapter.init({
        appId: 'test_app_id_real',
        appSecret: 'test_app_secret_real',
      });

      expect(adapter).toBeDefined();
    });

    it('应该验证必需的配置', async () => {
      await expect(adapter.init({
        appId: '',
        appSecret: 'secret',
      })).rejects.toThrow('WeChat appId and appSecret are required');
    });
  });

  describe('getAccessToken', () => {
    beforeEach(async () => {
      jest.spyOn(adapter, 'healthCheck').mockResolvedValue(true);
      await adapter.init({
        appId: 'test_app_id',
        appSecret: 'test_app_secret',
      });
    });

    it('应该返回 API 提供的 token', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => ({ access_token: 'test_access_token', expires_in: 7200 }),
      } as Response);

      await expect(adapter.getAccessToken()).resolves.toBe('test_access_token');
    });
  });

  describe('健康检查失败处理', () => {
    it('网络请求失败时应该返回 false', async () => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));

      await adapter.init({ appId: 'test_app_id', appSecret: 'test_app_secret' });
      await expect(adapter.healthCheck()).resolves.toBe(false);
    });
  });
});

describe('适配器接口一致性', () => {
  let mockAdapter: IWechatAdapter;
  let realAdapter: IWechatAdapter;

  beforeEach(() => {
    mockAdapter = WechatAdapterFactory.createAdapter('mock');
    realAdapter = WechatAdapterFactory.createAdapter('real');
  });

  it('两个适配器应该实现相同的接口', () => {
    const methods = [
      'init',
      'getAccessToken',
      'saveDraft',
      'publishArticle',
      'getPublishHistory',
      'deletePublished',
      'healthCheck',
    ];

    methods.forEach(method => {
      expect(typeof (mockAdapter as any)[method]).toBe('function');
      expect(typeof (realAdapter as any)[method]).toBe('function');
    });
  });
});

describe('适配器错误处理', () => {
  let adapter: RealWechatAdapter;

  beforeEach(() => {
    adapter = new RealWechatAdapter();
  });

  it('未初始化时应该提供有意义的错误', async () => {
    await expect(adapter.getAccessToken()).rejects.toThrow('WeChat 适配器未初始化');
  });
});

describe('模拟数据一致性', () => {
  let adapter: MockWechatAdapter;

  beforeEach(async () => {
    adapter = new MockWechatAdapter();
    await adapter.init({
      appId: 'test',
      appSecret: 'secret',
    });
  });

  it('返回的数据应该有一致的格式', async () => {
    const mediaId = await adapter.saveDraft({
      title: 'Title',
      author: 'Author',
      digest: 'Digest',
      content: 'Content',
    });

    const msgId = await adapter.publishArticle({
      title: 'Title',
      author: 'Author',
      content: 'Content',
      digest: 'Digest',
    });

    expect(mediaId).toMatch(/^mock_media_id_/);
    expect(msgId).toMatch(/^mock_msg_id_/);
  });

  it('应该支持多次调用', async () => {
    const calls = [];

    for (let i = 0; i < 5; i++) {
      const mediaId = await adapter.saveDraft({
        title: `Title ${i}`,
        author: 'Author',
        digest: `Digest ${i}`,
        content: `Content ${i}`,
      });
      calls.push(mediaId);
    }

    // 每次调用都应该返回不同的 ID
    const uniqueIds = new Set(calls);
    expect(uniqueIds.size).toBe(calls.length);
  });
});
