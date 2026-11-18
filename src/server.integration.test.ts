import request from 'supertest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createServer, ServerConfig } from './server';
import { getDatabase } from './db/database';

describe('publish workflow through the server', () => {
  let tempDir: string;
  let config: ServerConfig;
  let app: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-workflow-'));
    config = {
      port: 0,
      host: '127.0.0.1',
      dbPath: path.join(tempDir, 'publish.sqlite'),
      env: 'test',
      wechatMode: 'mock',
    };
    app = await createServer(config);
  });

  afterEach(async () => {
    await getDatabase().close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates, reviews, publishes, and retains a record after database reinitialization', async () => {
    const created = await request(app)
      .post('/api/publish/records')
      .send({ title: 'Workflow article', content: '<p>Workflow content</p>', creator: 'tester' })
      .expect(201);
    const recordId = created.body.data.id as string;
    expect(created.body.data.status).toBe('draft');

    const submitted = await request(app)
      .post(`/api/publish/records/${recordId}/submit-review`)
      .send({})
      .expect(200);
    expect(submitted.body.data.status).toBe('pending_review');

    const approved = await request(app)
      .post(`/api/publish/records/${recordId}/approve`)
      .send({ reviewer: 'reviewer', comment: 'approved' })
      .expect(200);
    expect(approved.body.data.status).toBe('approved');

    const published = await request(app)
      .post(`/api/publish/records/${recordId}/publish`)
      .send({})
      .expect(200);
    expect(published.body.data.status).toBe('published');
    expect(published.body.data.wechatMsgId).toContain('mock_msg_id_');

    const logs = await request(app)
      .get(`/api/publish/records/${recordId}/audit-logs`)
      .expect(200);
    expect(logs.body.data.length).toBeGreaterThanOrEqual(4);

    await getDatabase().close();
    app = await createServer(config);

    const restored = await request(app)
      .get(`/api/publish/records/${recordId}`)
      .expect(200);
    expect(restored.body.data.status).toBe('published');
    expect(restored.body.data.wechatMsgId).toBe(published.body.data.wechatMsgId);
  });

  it('saves and retrieves HTML content from Doocs (P2 feature)', async () => {
    // 创建初始草稿
    const created = await request(app)
      .post('/api/publish/records')
      .send({ 
        title: 'P2 HTML Content Test',
        content: 'Original markdown content',
        creator: 'p2-tester'
      })
      .expect(201);
    const recordId = created.body.data.id as string;

    // 保存 Doocs 排版后的 HTML
    const docsHtml = '<div class="article"><h2>P2 HTML Content Test</h2><p>这是来自 Doocs 的排版 HTML 内容</p></div>';
    const markdownSource = '# P2 HTML Content Test\n\n这是来自 Doocs 的排版 HTML 内容';
    
    const contentSaved = await request(app)
      .post(`/api/publish/records/${recordId}/content`)
      .send({
        htmlContent: docsHtml,
        markdownContent: markdownSource,
      })
      .expect(200);

    expect(contentSaved.body.data.htmlContent).toBe(docsHtml);
    expect(contentSaved.body.data.markdownContent).toBe(markdownSource);

    // 验证读取回来的内容正确
    const retrieved = await request(app)
      .get(`/api/publish/records/${recordId}`)
      .expect(200);

    expect(retrieved.body.data.htmlContent).toBe(docsHtml);
    expect(retrieved.body.data.markdownContent).toBe(markdownSource);
  });

  it('renders Markdown preview with theme support (P3 feature)', async () => {
    // 创建初始草稿
    const created = await request(app)
      .post('/api/publish/records')
      .send({ 
        title: 'P3 Preview Test',
        content: '# P3 Preview\n\nThis is a **test** article for preview rendering.',
        creator: 'p3-tester'
      })
      .expect(201);
    const recordId = created.body.data.id as string;

    // 获取 Markdown 预览（使用默认主题）
    const preview = await request(app)
      .get(`/api/publish/records/${recordId}/preview`)
      .expect(200);

    expect(preview.body.success).toBe(true);
    expect(preview.body.data.preview).toContain('<!DOCTYPE html>');
    expect(preview.body.data.preview).toContain('<h1>');
    expect(preview.body.data.preview).toContain('<strong>test</strong>');
    expect(preview.body.data.theme).toBe('default');

    // 获取使用 wechat 主题的预览
    const wechatPreview = await request(app)
      .get(`/api/publish/records/${recordId}/preview?theme=wechat`)
      .expect(200);

    expect(wechatPreview.body.data.theme).toBe('wechat');
    expect(wechatPreview.body.data.preview).toContain('#fd5c5c');
  });

  it('renders HTML content preview (P3 feature for Doocs content)', async () => {
    // 创建初始草稿
    const created = await request(app)
      .post('/api/publish/records')
      .send({ 
        title: 'P3 HTML Preview Test',
        content: 'Original content',
        creator: 'p3-html-tester'
      })
      .expect(201);
    const recordId = created.body.data.id as string;

    // 保存 HTML 内容（从 Doocs）
    const docsHtml = '<article><h2>P3 Test Article</h2><p>Content from Doocs</p></article>';
    await request(app)
      .post(`/api/publish/records/${recordId}/content`)
      .send({ htmlContent: docsHtml })
      .expect(200);

    // 获取 HTML 预览
    const preview = await request(app)
      .get(`/api/publish/records/${recordId}/preview`)
      .expect(200);

    expect(preview.body.success).toBe(true);
    expect(preview.body.data.preview).toContain(docsHtml);
    expect(preview.body.data.preview).toContain('<!DOCTYPE html>');
  });

  it('validates content compliance and structure (P4 feature)', async () => {
    // 验证有效内容
    const validContent = '# Title\n\nThis is a valid article with enough content to pass validation.';
    
    const validResult = await request(app)
      .post('/api/publish/validate')
      .send({ content: validContent })
      .expect(200);

    expect(validResult.body.success).toBe(true);
    expect(validResult.body.data.passed).toBe(true);
    expect(validResult.body.data.errors.length).toBe(0);

    // 验证过短内容
    const shortContent = 'Too short';
    const shortResult = await request(app)
      .post('/api/publish/validate')
      .send({ content: shortContent })
      .expect(200);

    expect(shortResult.body.data.passed).toBe(false);
    expect(shortResult.body.data.errors.length).toBeGreaterThan(0);
    expect(shortResult.body.data.errors[0].code).toBe('TOO_SHORT');
  });

  it('normalizes content format (P4 feature)', async () => {
    const messy = '# Title\r\n\n\n\nContent with extra lines   \r\nand mixed line endings';
    
    const result = await request(app)
      .post('/api/publish/normalize')
      .send({ content: messy })
      .expect(200);

    expect(result.body.success).toBe(true);
    expect(result.body.data.normalized).not.toContain('\r\n');
    expect(result.body.data.normalized).not.toContain('\n\n\n');
    expect(result.body.data.changes).toBe(true);
  });
});

describe('VaultWatcher and AutoPublisher (P5 feature)', () => {
  let tempVaultDir: string;
  let contentDir: string;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));
    contentDir = path.join(tempVaultDir, 'content');
    fs.mkdirSync(contentDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  });

  it('watches file system for new Markdown files (P5 feature)', async () => {
    const { VaultWatcher } = require('./services/file-system');

    const watcher = new VaultWatcher({
      vaultPath: tempVaultDir,
      contentFolder: 'content',
    });

    const fileChangeEvents: any[] = [];
    watcher.on('fileChange', (event: any) => {
      fileChangeEvents.push(event);
    });

    // 启动监听
    await watcher.watch();

    // 写入测试文件
    const testFile = path.join(contentDir, 'test-article.md');
    const testContent = '# Test Article\n\nThis is a test article for P5.';
    fs.writeFileSync(testFile, testContent, 'utf-8');

    // 给 chokidar 时间检测文件变化
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 验证事件被触发
    expect(fileChangeEvents.length).toBeGreaterThan(0);
    const addEvent = fileChangeEvents.find((e) => e.type === 'add');
    expect(addEvent).toBeDefined();
    expect(addEvent.path).toContain('test-article.md');
    expect(addEvent.content).toContain('Test Article');

    await watcher.unwatch();
  });
});