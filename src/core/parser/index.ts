/**
 * @file src/core/parser/index.ts
 * @description Markdown 解析器 - 读取 Obsidian Vault 中的 Markdown 文件，
 * 提取 YAML Frontmatter 元数据、正文内容等
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * 文档元数据接口
 */
export interface DocumentMetadata {
  title: string;
  author?: string;
  tags?: string[];
  category?: string;
  summary?: string;
  publishDate?: string;
  published?: boolean;
  weixinMediaId?: string;
  weixinUrl?: string;
  attachments?: string[];
}

/**
 * 解析后的文档接口
 */
export interface ParsedDocument {
  metadata: DocumentMetadata;
  content: string;
  filePath: string;
  fileName: string;
}

/**
 * Markdown 解析器类
 */
export class MarkdownParser {
  /**
   * 解析本地 Markdown 文件
   * @param filePath 文件的绝对路径
   * @param vaultRoot vault 根目录（用于相对路径解析）
   * @returns 解析后的文档
   */
  async parse(filePath: string, vaultRoot?: string): Promise<ParsedDocument> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const parsed = this.parseContent(content);
    
    // 解析相对路径中的 attachments
    if (parsed.metadata.attachments && vaultRoot) {
      const docDir = path.dirname(filePath);
      parsed.metadata.attachments = parsed.metadata.attachments.map(att => 
        path.resolve(docDir, att)
      );
    }
    
    return {
      ...parsed,
      filePath,
      fileName
    };
  }

  /**
   * 解析原始 Markdown 内容字符串
   * @param content 原始 Markdown 文本
   * @returns 分离的元数据和内容
   */
  parseContent(content: string): ParsedDocument {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    let metadata: DocumentMetadata;
    let bodyContent: string;
    
    if (frontmatterMatch) {
      // 找到 YAML Frontmatter
      const frontmatterStr = frontmatterMatch[1];
      const rawData = yaml.parse(frontmatterStr) as Record<string, unknown>;
      
      // 转换 YAML 中的 snake_case 为 TypeScript 中的 camelCase
      metadata = this.transformMetadata(rawData);
      bodyContent = frontmatterMatch[2].trim();
    } else {
      // 没有 Frontmatter：从 H1/H2 提取标题
      const titleMatch = content.match(/^#+\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
      
      metadata = { title };
      bodyContent = content.trim();
    }
    
    // 验证元数据
    const validation = this.validateMetadata(metadata);
    if (!validation.valid) {
      console.warn(`元数据验证警告："${metadata.title}": ${validation.errors?.join(', ')}`);
    }
    
    return {
      metadata,
      content: bodyContent,
      filePath: '',
      fileName: ''
    };
  }

  /**
   * 转换 YAML 中的 snake_case 为 TypeScript 的 camelCase
   */
  private transformMetadata(rawData: Record<string, unknown>): DocumentMetadata {
    const metadata: DocumentMetadata = {
      title: String(rawData.title || 'Untitled')
    };
    
    if (rawData.author) metadata.author = String(rawData.author);
    if (rawData.tags) {
      metadata.tags = Array.isArray(rawData.tags) 
        ? rawData.tags.map(String) 
        : [String(rawData.tags)];
    }
    if (rawData.category) metadata.category = String(rawData.category);
    if (rawData.summary) metadata.summary = String(rawData.summary);
    if (rawData.publish_date) metadata.publishDate = String(rawData.publish_date);
    if (rawData.published !== undefined) metadata.published = Boolean(rawData.published);
    if (rawData.weixin_media_id) metadata.weixinMediaId = String(rawData.weixin_media_id);
    if (rawData.weixin_url) metadata.weixinUrl = String(rawData.weixin_url);
    if (rawData.attachments) {
      metadata.attachments = Array.isArray(rawData.attachments)
        ? rawData.attachments.map(String)
        : [String(rawData.attachments)];
    }
    
    return metadata;
  }

  /**
   * 验证元数据是否符合 Schema
   * @param metadata 要验证的元数据对象
   * @returns 验证结果
   */
  validateMetadata(metadata: unknown): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!metadata || typeof metadata !== 'object') {
      return { valid: false, errors: ['元数据必须是对象'] };
    }
    
    const data = metadata as Record<string, unknown>;
    
    // 必需字段: title
    if (!data.title || typeof data.title !== 'string' || String(data.title).trim() === '') {
      errors.push('title 字段必需且不能为空字符串');
    }
    
    // 可选字段验证
    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      errors.push('tags 必须是数组');
    }
    
    if (data.published === true && !data.weixinMediaId) {
      errors.push('published=true 时必须设置 weixin_media_id');
    }
    
    if (data.publishDate && !/^\d{4}-\d{2}-\d{2}/.test(String(data.publishDate))) {
      errors.push('publish_date 必须为 ISO8601 格式 (YYYY-MM-DD)');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

/**
 * 向后兼容的导出函数
 */
export async function parseMarkdownFile(
  filePath: string,
  content: string
): Promise<ParsedDocument> {
  const parser = new MarkdownParser();
  return parser.parseContent(content);
}

export async function validateMetadata(metadata: Record<string, any>): Promise<boolean> {
  const parser = new MarkdownParser();
  const result = parser.validateMetadata(metadata);
  return result.valid;
}

export default {
  MarkdownParser,
  parseMarkdownFile,
  validateMetadata,
};
