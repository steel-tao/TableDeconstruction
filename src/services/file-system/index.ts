/**
 * @file src/services/file-system/index.ts
 * @description 文件系统操作与 Obsidian Vault 监听
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  content?: string;
  timestamp: number;
}

export interface VaultConfig {
  // Obsidian Vault 根目录
  vaultPath: string;
  // 要监听的内容文件夹
  contentFolder?: string;
  // 是否启用自动处理
  autoProcess?: boolean;
}

/**
 * Obsidian Vault 监听器
 */
export class VaultWatcher extends EventEmitter {
  private vaultPath: string;
  private contentFolder: string;
  private isWatching: boolean = false;
  private watcher: FSWatcher | null = null;
  private watchPath: string;

  constructor(config: VaultConfig) {
    super();
    this.vaultPath = config.vaultPath;
    this.contentFolder = config.contentFolder || 'content';
    this.watchPath = path.join(this.vaultPath, this.contentFolder);
  }

  /**
   * 启动监听
   */
  async watch(): Promise<void> {
    if (this.isWatching) {
      console.log('✓ Vault watcher already running');
      return;
    }

    // 确保监听路径存在
    if (!fs.existsSync(this.watchPath)) {
      console.log(`⚠ Content folder not found: ${this.watchPath}`);
      fs.mkdirSync(this.watchPath, { recursive: true });
    }

    // 创建 chokidar 监听器
    this.watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      ignored: /(^|[\/\\])\.|\.tmp$|node_modules/,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      cwd: this.watchPath,
    });

    // 监听文件添加
    this.watcher.on('add', async (filePath: string) => {
      if (!filePath.endsWith('.md')) return;
      
      try {
        const fullPath = path.join(this.watchPath, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        this.emit('fileChange', {
          type: 'add',
          path: filePath,
          content,
          timestamp: Date.now(),
        } as FileChangeEvent);
        
        console.log(`✓ File added: ${filePath}`);
      } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error);
      }
    });

    // 监听文件修改
    this.watcher.on('change', async (filePath: string) => {
      if (!filePath.endsWith('.md')) return;
      
      try {
        const fullPath = path.join(this.watchPath, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        this.emit('fileChange', {
          type: 'change',
          path: filePath,
          content,
          timestamp: Date.now(),
        } as FileChangeEvent);
        
        console.log(`✓ File changed: ${filePath}`);
      } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error);
      }
    });

    // 监听文件删除
    this.watcher.on('unlink', (filePath: string) => {
      if (!filePath.endsWith('.md')) return;
      
      this.emit('fileChange', {
        type: 'unlink',
        path: filePath,
        timestamp: Date.now(),
      } as FileChangeEvent);
      
      console.log(`✓ File deleted: ${filePath}`);
    });

    // 监听错误
    this.watcher.on('error', (error: Error) => {
      console.error('❌ Watcher error:', error);
      this.emit('error', error);
    });

    this.isWatching = true;
    console.log(`✓ Vault watcher started: ${this.watchPath}`);
  }

  /**
   * 停止监听
   */
  async unwatch(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      console.log('⚠ Vault watcher not running');
      return;
    }

    await this.watcher.close();
    this.isWatching = false;
    console.log('✓ Vault watcher stopped');
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.watchPath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * 写入文件
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.watchPath, filePath);
    const dir = path.dirname(fullPath);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✓ File written: ${filePath}`);
  }

  /**
   * 列出文件夹内的文件
   */
  async listFiles(folderPath: string = ''): Promise<string[]> {
    const targetPath = folderPath 
      ? path.join(this.watchPath, folderPath)
      : this.watchPath;

    if (!fs.existsSync(targetPath)) {
      return [];
    }

    const files: string[] = [];
    
    const walk = (dir: string, prefix: string = '') => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        // 跳过隐藏文件和特殊文件夹
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const fullPath = path.join(dir, item);
        const relativePath = prefix ? `${prefix}/${item}` : item;
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile() && item.endsWith('.md')) {
          files.push(relativePath);
        } else if (stat.isDirectory()) {
          walk(fullPath, relativePath);
        }
      }
    };

    walk(targetPath);
    return files;
  }

  /**
   * 获取文件元信息
   */
  async getFileStats(filePath: string): Promise<{
    size: number;
    modifiedTime: number;
    createdTime: number;
  }> {
    const fullPath = path.join(this.watchPath, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(fullPath);

    return {
      size: stats.size,
      modifiedTime: stats.mtimeMs,
      createdTime: stats.birthtimeMs,
    };
  }

  /**
   * 检查是否正在监听
   */
  isRunning(): boolean {
    return this.isWatching;
  }
}

export default {
  VaultWatcher,
};
