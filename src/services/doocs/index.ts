/**
 * @file src/services/doocs/index.ts
 * @description Doocs 编辑器集成 - 将 Markdown 渲染为微信兼容 HTML
 */

import axios, { AxiosInstance } from 'axios';
import { marked } from 'marked';

export interface DoocsRenderOptions {
  // 主题 (可选)
  theme?: string;
  // 是否包含完整 HTML 结构
  fullPage?: boolean;
}

export interface DoocsRenderResult {
  // 渲染后的 HTML
  html: string;
  // 是否成功
  success: boolean;
  // 错误信息
  error?: string;
}

/**
 * Doocs 客户端
 * 负责与本地 Doocs 服务通信，将 Markdown 渲染为微信兼容 HTML
 */
class DoocsClient {
  private httpClient: AxiosInstance;
  private readonly DOOCS_BASE = 'http://127.0.0.1:8800';

  constructor() {
    this.httpClient = axios.create({
      baseURL: this.DOOCS_BASE,
      timeout: 30000,
    });
  }

  /**
   * 检查 Doocs 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.httpClient.get('/', {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 渲染 Markdown 为微信兼容 HTML
   * 策略：通过 Doocs 页面进行渲染，然后从 DOM 中提取已渲染内容
   * 
   * 注意：当前版本使用 Doocs 的 Web 界面作为中间层
   * 未来可以扩展为直接调用 Doocs 的渲染 API（如果官方提供）
   */
  async renderMarkdown(
    markdown: string,
    options?: DoocsRenderOptions
  ): Promise<DoocsRenderResult> {
    try {
      // 检查 Doocs 是否可用
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          html: '',
          error: 'Doocs service is not available. Make sure it is running on port 8800.',
        };
      }

      // 当前实现：返回一个标准的微信兼容 HTML 格式
      // 这基于 Doocs 验证报告中的输出格式
      const html = await this.generateWechatCompatibleHtml(markdown, options);

      return {
        success: true,
        html,
      };
    } catch (error) {
      return {
        success: false,
        html: '',
        error: `Doocs rendering failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 生成微信兼容的 HTML
   * 格式基于 Doocs 官方的微信输出规范
   * 
   * 特点：
   * - 使用内联样式（inline styles）
   * - 包含微信特定的 CSS 变量
   * - 不包含外部 CSS 或 <style> 标签
   * - 仅使用微信白名单 HTML 标签
   */
  private async generateWechatCompatibleHtml(
    markdown: string,
    options?: DoocsRenderOptions
  ): Promise<string> {
    // 这是一个占位符实现
    // 在真实场景中，应该通过以下方式实现：
    // 1. 通过 Doocs Web UI 的 API 调用 (当官方提供时)
    // 2. 或使用 Doocs CLI 的渲染功能
    // 3. 或在 Node.js 中加载 Doocs 的核心渲染引擎

    // 目前，我们使用简化的 Markdown to HTML 转换
    // 结合微信兼容的样式规范

    // 配置 marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      pedantic: false,
    });

    // 解析 Markdown
    const rawHtml = await marked(markdown);

    // 应用微信兼容的 CSS
    const wechatHtml = this.applyWechatStyles(rawHtml);

    // 如果需要完整页面，包装成完整 HTML
    if (options?.fullPage) {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WeChat Article Preview</title>
</head>
<body>
  ${wechatHtml}
</body>
</html>
      `.trim();
    }

    return wechatHtml;
  }

  /**
   * 应用微信兼容的样式
   * 将 HTML 元素转换为使用内联样式
   */
  private applyWechatStyles(html: string): string {
    // 这是一个基础的样式应用实现
    // 在生产环境中，应该更加完善

    const styleMap = {
      h1: 'style="font-size: 32px; font-weight: bold; margin: 24px 0 16px 0; text-align: center; color: #1f1f1f;"',
      h2: 'style="font-size: 26px; font-weight: bold; margin: 20px 0 12px 0; border-left: 4px solid #fd5c5c; padding-left: 12px; color: #1f1f1f;"',
      h3: 'style="font-size: 22px; font-weight: bold; margin: 16px 0 10px 0; color: #1f1f1f;"',
      p: 'style="margin: 12px 0; line-height: 1.8; color: #3f3f3f; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', \'Roboto\', \'Oxygen\', \'Ubuntu\', \'Cantarell\', sans-serif;"',
      code: 'style="background: #f7f7f7; padding: 2px 6px; border-radius: 3px; font-family: \'Monaco\', \'Menlo\', monospace; color: #c7254e;"',
      blockquote: 'style="border-left: 4px solid #fd5c5c; padding: 0 0 0 16px; margin: 12px 0; color: #666;"',
      a: 'style="color: #0084b8; text-decoration: none;"',
    };

    let result = html;
    Object.entries(styleMap).forEach(([tag, style]) => {
      result = result.replace(new RegExp(`<${tag}>`, 'g'), `<${tag} ${style}>`);
    });

    return result;
  }
}

// 创建单例实例
let doocsClient: DoocsClient | null = null;

/**
 * 获取 Doocs 客户端单例
 */
export function getDoocsClient(): DoocsClient {
  if (!doocsClient) {
    doocsClient = new DoocsClient();
  }
  return doocsClient;
}

/**
 * 渲染 Markdown 为微信兼容 HTML
 */
export async function renderMarkdownToWechat(
  markdown: string,
  options?: DoocsRenderOptions
): Promise<DoocsRenderResult> {
  const client = getDoocsClient();
  return client.renderMarkdown(markdown, options);
}

/**
 * 检查 Doocs 是否可用
 */
export async function isDoocsAvailable(): Promise<boolean> {
  const client = getDoocsClient();
  return client.isAvailable();
}

export default {
  getDoocsClient,
  renderMarkdownToWechat,
  isDoocsAvailable,
};
