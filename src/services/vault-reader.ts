/**
 * VaultReader - Obsidian 文库读取与提取工具
 * 
 * 目的: 提供便捷的 API 从 Obsidian Vault 中读取、搜索、导出文档
 * 支持: 按系列分类、按关键词搜索、导出为 Markdown/JSON
 * 依赖: 仅 Node.js 内置 API (fs, path)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 文档元数据类型
 */
interface VaultDocument {
  filename: string;
  filepath: string;
  title: string;
  content: string;
  wordCount: number;
  estimatedReadTime: string;
  series?: string;
  createdDate?: Date;
  size: number;
}

/**
 * VaultReader - 主要工具类
 */
export class VaultReader {
  private vaultPath: string;
  private documents: Map<string, VaultDocument> = new Map();

  constructor(vaultPath: string) {
    if (!fs.existsSync(vaultPath)) {
      throw new Error(`Vault path not found: ${vaultPath}`);
    }
    this.vaultPath = vaultPath;
  }

  /**
   * 扫描 Vault 中的所有 Markdown 文件
   */
  async scanVault(): Promise<VaultDocument[]> {
    const documents: VaultDocument[] = [];
    
    const walkDir = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        // 跳过隐藏文件夹和系统文件夹
        if (entry.name.startsWith('.')) continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const doc = this.parseDocument(fullPath);
            if (doc) {
              documents.push(doc);
              this.documents.set(fullPath, doc);
            }
          } catch (error) {
            console.warn(`Failed to parse ${fullPath}:`, error);
          }
        }
      }
    };

    walkDir(this.vaultPath);
    return documents;
  }

  /**
   * 解析单个 Markdown 文件
   */
  private parseDocument(filepath: string): VaultDocument | null {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      if (!content.trim()) return null;

      const filename = path.basename(filepath);
      const stats = fs.statSync(filepath);

      // 提取标题（第一个 Markdown 标题）
      const titleMatch = content.match(/^#+\s+(.+?)$/m);
      const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '');

      // 计算字数（中文/英文字符数）
      const wordCount = this.countWords(content);

      // 估算阅读时间（按 200 字/分钟）
      const readTimeMinutes = Math.ceil(wordCount / 200);
      const estimatedReadTime = `${readTimeMinutes}-${Math.ceil(readTimeMinutes * 1.2)} 分钟`;

      // 尝试识别系列（从路径或文件名）
      const series = this.extractSeries(filepath, content);

      // 获取创建日期
      const createdDate = new Date(stats.birthtime);

      return {
        filename,
        filepath,
        title,
        content,
        wordCount,
        estimatedReadTime,
        series: series || undefined,
        createdDate,
        size: stats.size
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 计算内容中的字数
   */
  private countWords(content: string): number {
    // 移除 YAML frontmatter
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
    // 移除 Markdown 语法
    const cleaned = withoutFrontmatter
      .replace(/[#\*\-\[\]\(\)!`]/g, '')
      .replace(/\n\n+/g, '\n');
    
    return cleaned.length;
  }

  /**
   * 从文件路径或内容中提取系列名称
   */
  private extractSeries(filepath: string, content: string): string | null {
    // 从文件夹名称提取
    const dirMatch = filepath.match(/桌面解构\\([^\\]+)\\/);
    if (dirMatch) {
      return dirMatch[1];
    }

    // 从文件名提取
    const fileMatch = path.basename(filepath).match(/^(.*?)[\d]{0,2}\s*《/);
    if (fileMatch) {
      return fileMatch[1].trim();
    }

    return null;
  }

  /**
   * 列出所有文档
   */
  async listDocuments(options?: {
    series?: string;
    sort?: 'name' | 'size' | 'time';
    limit?: number;
  }): Promise<VaultDocument[]> {
    if (this.documents.size === 0) {
      await this.scanVault();
    }

    let docs = Array.from(this.documents.values());

    // 按系列过滤
    if (options?.series) {
      docs = docs.filter(d => d.series === options.series);
    }

    // 排序
    if (options?.sort === 'size') {
      docs.sort((a, b) => b.size - a.size);
    } else if (options?.sort === 'time') {
      docs.sort((a, b) => (b.createdDate?.getTime() || 0) - (a.createdDate?.getTime() || 0));
    } else {
      docs.sort((a, b) => a.title.localeCompare(b.title));
    }

    // 限制数量
    if (options?.limit) {
      docs = docs.slice(0, options.limit);
    }

    return docs;
  }

  /**
   * 按系列分组列出文档
   */
  async listBySeries(): Promise<Map<string, VaultDocument[]>> {
    if (this.documents.size === 0) {
      await this.scanVault();
    }

    const bySeries = new Map<string, VaultDocument[]>();

    for (const doc of this.documents.values()) {
      const series = doc.series || '(无系列)';
      if (!bySeries.has(series)) {
        bySeries.set(series, []);
      }
      bySeries.get(series)!.push(doc);
    }

    // 每个系列内按时间排序
    for (const docs of bySeries.values()) {
      docs.sort((a, b) => (a.createdDate?.getTime() || 0) - (b.createdDate?.getTime() || 0));
    }

    return bySeries;
  }

  /**
   * 搜索文档
   */
  async search(query: string, options?: {
    searchContent?: boolean;
    limit?: number;
  }): Promise<VaultDocument[]> {
    if (this.documents.size === 0) {
      await this.scanVault();
    }

    const q = query.toLowerCase();
    let results = Array.from(this.documents.values()).filter(doc => {
      const titleMatch = doc.title.toLowerCase().includes(q);
      const fileMatch = doc.filename.toLowerCase().includes(q);
      const contentMatch = options?.searchContent && doc.content.toLowerCase().includes(q);

      return titleMatch || fileMatch || contentMatch;
    });

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 读取指定文档的原始内容
   */
  async readDocument(filename: string): Promise<VaultDocument | null> {
    if (this.documents.size === 0) {
      await this.scanVault();
    }

    // 精确匹配
    for (const doc of this.documents.values()) {
      if (doc.filename === filename) {
        return doc;
      }
    }

    // 模糊匹配
    for (const doc of this.documents.values()) {
      if (doc.filename.includes(filename)) {
        return doc;
      }
    }

    return null;
  }

  /**
   * 导出文档为 Markdown（保留原始格式）
   */
  async exportMarkdown(filename: string, outputPath?: string): Promise<string> {
    const doc = await this.readDocument(filename);
    if (!doc) {
      throw new Error(`Document not found: ${filename}`);
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, doc.content, 'utf-8');
      return outputPath;
    }

    return doc.content;
  }

  /**
   * 导出文档元数据为 JSON
   */
  async exportMetadata(options?: {
    documents?: string[];
    outputPath?: string;
  }): Promise<any> {
    if (this.documents.size === 0) {
      await this.scanVault();
    }

    let docs = Array.from(this.documents.values());

    if (options?.documents) {
      docs = docs.filter(d => options.documents!.includes(d.filename));
    }

    const metadata = docs.map(d => ({
      filename: d.filename,
      title: d.title,
      series: d.series,
      wordCount: d.wordCount,
      estimatedReadTime: d.estimatedReadTime,
      createdDate: d.createdDate?.toISOString(),
      size: d.size
    }));

    const result = {
      vaultPath: this.vaultPath,
      totalDocuments: metadata.length,
      documents: metadata,
      generatedAt: new Date().toISOString()
    };

    if (options?.outputPath) {
      fs.writeFileSync(options.outputPath, JSON.stringify(result, null, 2), 'utf-8');
      return options.outputPath;
    }

    return result;
  }

  /**
   * 获取 Vault 统计信息
   */
  async getVaultStats(): Promise<{
    totalDocuments: number;
    totalWords: number;
    totalSize: number;
    averageWordCount: number;
    series: Map<string, number>;
  }> {
    if (this.documents.size === 0) {
      await this.scanVault();
    }

    const docs = Array.from(this.documents.values());
    const totalWords = docs.reduce((sum, d) => sum + d.wordCount, 0);
    const totalSize = docs.reduce((sum, d) => sum + d.size, 0);
    const averageWordCount = Math.round(totalWords / docs.length);

    const series = new Map<string, number>();
    for (const doc of docs) {
      const s = doc.series || '(无系列)';
      series.set(s, (series.get(s) || 0) + 1);
    }

    return {
      totalDocuments: docs.length,
      totalWords,
      totalSize,
      averageWordCount,
      series
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.documents.clear();
  }
}

export default VaultReader;
