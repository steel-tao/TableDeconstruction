/**
 * @file src/services/file-system/auto-publisher.ts
 * @description 自动发布处理器：监听文件变化 → 自动创建草稿 → 保存内容
 */

import { VaultWatcher, FileChangeEvent } from './index.js';
import * as PublishService from '../publish/db-manager.js';
import * as Validator from '../../core/validator/index.js';

export interface AutoPublisherConfig {
  vaultPath: string;
  contentFolder?: string;
  autoValidate?: boolean; // 自动校验内容
}

/**
 * 自动发布处理器
 */
export class AutoPublisher {
  private watcher: VaultWatcher;
  private autoValidate: boolean;
  private processing: Set<string> = new Set(); // 防止重复处理

  constructor(config: AutoPublisherConfig) {
    this.watcher = new VaultWatcher({
      vaultPath: config.vaultPath,
      contentFolder: config.contentFolder || 'content',
      autoProcess: true,
    });

    this.autoValidate = config.autoValidate ?? true;

    // 监听文件变化事件
    this.watcher.on('fileChange', (event: FileChangeEvent) => {
      this.handleFileChange(event).catch((error) => {
        console.error('❌ Error handling file change:', error);
      });
    });

    this.watcher.on('error', (error: Error) => {
      console.error('❌ Watcher error:', error);
    });
  }

  /**
   * 启动自动发布
   */
  async start(): Promise<void> {
    console.log('🚀 Starting auto-publisher...');
    await this.watcher.watch();
    console.log('✓ Auto-publisher started');
  }

  /**
   * 停止自动发布
   */
  async stop(): Promise<void> {
    console.log('⏹️  Stopping auto-publisher...');
    await this.watcher.unwatch();
    console.log('✓ Auto-publisher stopped');
  }

  /**
   * 处理文件变化
   */
  private async handleFileChange(event: FileChangeEvent): Promise<void> {
    const { type, path: filePath, content } = event;

    // 防止重复处理
    if (this.processing.has(filePath)) {
      console.log(`⚠️  Skipping duplicate processing: ${filePath}`);
      return;
    }

    this.processing.add(filePath);

    try {
      switch (type) {
        case 'add':
        case 'change':
          await this.handleFileAddOrChange(filePath, content!);
          break;
        case 'unlink':
          await this.handleFileDelete(filePath);
          break;
      }
    } finally {
      this.processing.delete(filePath);
    }
  }

  /**
   * 处理文件添加或修改
   */
  private async handleFileAddOrChange(
    filePath: string,
    content: string
  ): Promise<void> {
    console.log(`📝 Processing file: ${filePath}`);

    try {
      // 1. 校验内容（可选）
      if (this.autoValidate) {
        const validationResult = await Validator.validateMarkdownFile(filePath, content);
        
        if (!validationResult.passed) {
          console.warn(`⚠️  Validation warnings for ${filePath}:`);
          validationResult.errors.forEach((err) => {
            console.warn(`   - ${err.code}: ${err.message}`);
          });
          
          // 如果有严重错误，不处理
          if (validationResult.errors.some((e) => e.severity === 'error')) {
            console.log(`❌ Skipping ${filePath} due to validation errors`);
            return;
          }
        }
      }

      // 2. 规范化内容
      const normalizedContent = await Validator.normalizeContent(content);

      // 3. 提取标题（文件名作为标题）
      const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Untitled';

      // 4. 检查是否已存在相同来源的记录
      const records = await PublishService.listPublishRecords(undefined, 1000, 0);
      const existing = records.find((r) => r.filePath === filePath);

      let recordId: string;

      if (existing) {
        // 更新现有记录
        const updated = await PublishService.updatePublishRecord(existing.id, {
          content: normalizedContent,
          markdownContent: normalizedContent,
        });

        if (updated) {
          recordId = updated.id;
          console.log(`✓ Updated existing record: ${recordId}`);
        } else {
          throw new Error('Failed to update record');
        }
      } else {
        // 创建新记录
        const created = await PublishService.createPublishRecord(
          fileName,
          normalizedContent,
          'vault-watcher',
          filePath
        );

        recordId = created.id;
        console.log(`✓ Created new record: ${recordId}`);
      }

      // 5. 保存规范化后的内容和原始 Markdown
      await PublishService.updatePublishRecord(recordId, {
        content: normalizedContent,
        markdownContent: normalizedContent,
        filePath,
      });

      console.log(`✅ Successfully processed: ${filePath} → Record: ${recordId}`);
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
    }
  }

  /**
   * 处理文件删除
   */
  private async handleFileDelete(filePath: string): Promise<void> {
    console.log(`🗑️  File deleted: ${filePath}`);

    try {
      // 在记录中标记为已删除的来源
      const records = await PublishService.listPublishRecords(undefined, 1000, 0);
      const record = records.find((r) => r.filePath === filePath);

      if (record) {
        // 可选：删除记录或标记为已归档
        console.log(
          `ℹ️  Record ${record.id} has orphaned source: ${filePath}`
        );
      }
    } catch (error) {
      console.error(`❌ Error handling file delete ${filePath}:`, error);
    }
  }

  /**
   * 获取监听状态
   */
  isRunning(): boolean {
    return this.watcher.isRunning();
  }
}

export default AutoPublisher;

