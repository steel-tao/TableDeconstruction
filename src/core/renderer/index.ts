/**
 * @file src/core/renderer/index.ts
 * @description 渲染引擎：Markdown → HTML，支持主题和预览
 */

import { marked } from 'marked';

export interface RenderOptions {
  // CSS主题名称
  theme?: string;
  // 是否应用响应式样式
  responsive?: boolean;
  // 额外的CSS规则
  customCSS?: string;
}

export interface RenderedOutput {
  // 生成的HTML
  html: string;
  // 生成的JSON (用于微信API)
  json?: Record<string, any>;
  // 生成时间
  generatedAt: Date;
  // 主题信息
  theme: string;
}

// ============================================================================
// 主题定义
// ============================================================================

const THEMES: Record<string, string> = {
  default: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
    }
    h1 { font-size: 28px; font-weight: bold; margin: 24px 0 16px 0; }
    h2 { font-size: 24px; font-weight: bold; margin: 20px 0 12px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
    h3 { font-size: 20px; font-weight: bold; margin: 16px 0 10px 0; }
    p { margin: 12px 0; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #667eea; padding-left: 16px; margin: 12px 0; color: #666; }
    ul, ol { margin: 12px 0 12px 20px; }
    li { margin: 6px 0; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 12px 0; border-radius: 6px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
  `,
  wechat: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.8;
      color: #3f3f3f;
    }
    h1 { font-size: 32px; font-weight: bold; margin: 24px 0 16px 0; text-align: center; color: #1f1f1f; }
    h2 { font-size: 26px; font-weight: bold; margin: 20px 0 12px 0; border-left: 4px solid #fd5c5c; padding-left: 12px; }
    h3 { font-size: 22px; font-weight: bold; margin: 16px 0 10px 0; }
    p { margin: 12px 0; }
    code { background: #f7f7f7; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; color: #c7254e; }
    pre { background: #f7f7f7; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; border: 1px solid #e0e0e0; }
    pre code { background: none; padding: 0; color: #000; }
    blockquote { border-left: 4px solid #fd5c5c; padding: 0 0 0 16px; margin: 12px 0; }
    ul { margin: 12px 0 12px 20px; }
    li { margin: 6px 0; }
    a { color: #0084b8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 12px 0; border-radius: 4px; }
  `,
  dark: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #e0e0e0;
      background: #1e1e1e;
    }
    h1 { font-size: 28px; font-weight: bold; margin: 24px 0 16px 0; color: #fff; }
    h2 { font-size: 24px; font-weight: bold; margin: 20px 0 12px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px; color: #fff; }
    h3 { font-size: 20px; font-weight: bold; margin: 16px 0 10px 0; }
    p { margin: 12px 0; }
    code { background: #2d2d2d; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; color: #ce9178; }
    pre { background: #2d2d2d; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
    pre code { background: none; padding: 0; color: #d4d4d4; }
    blockquote { border-left: 4px solid #667eea; padding-left: 16px; margin: 12px 0; color: #999; }
    ul, ol { margin: 12px 0 12px 20px; }
    li { margin: 6px 0; }
    a { color: #569cd6; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 12px 0; border-radius: 6px; }
  `
};

// ============================================================================
// 渲染函数
// ============================================================================

/**
 * 渲染 Markdown 为 HTML
 */
export async function renderMarkdown(
  markdown: string,
  options?: RenderOptions
): Promise<RenderedOutput> {
  try {
    // 配置 marked 选项
    marked.setOptions({
      breaks: true,
      gfm: true,
      pedantic: false,
    });

    // 解析 Markdown
    const rawHtml = await marked(markdown);

    // 应用主题
    const themeName = options?.theme || 'default';
    const themedHtml = await applyTheme(rawHtml, themeName);

    // 添加自定义 CSS
    let finalHtml = themedHtml;
    if (options?.customCSS) {
      finalHtml = `<style>${options.customCSS}</style>\n${themedHtml}`;
    }

    return {
      html: finalHtml,
      generatedAt: new Date(),
      theme: themeName,
    };
  } catch (error) {
    throw new Error(`渲染失败: ${(error as Error).message}`);
  }
}

/**
 * 应用 CSS 主题
 */
export async function applyTheme(html: string, theme: string): Promise<string> {
  const themeCSS = THEMES[theme] || THEMES.default;
  
  // 创建带样式的 HTML 包装
  const wrappedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ${themeCSS}
      </style>
    </head>
    <body>
      <article>
        ${html}
      </article>
    </body>
    </html>
  `.trim();

  return wrappedHtml;
}

/**
 * 生成预览 HTML（包含完整样式）
 */
export async function previewRender(htmlContent: string): Promise<string> {
  // 如果输入是纯 HTML，直接包装
  if (htmlContent.includes('<html>') || htmlContent.includes('<!DOCTYPE')) {
    return htmlContent;
  }

  // 如果是 Markdown，先渲染
  if (!htmlContent.includes('<')) {
    return (await renderMarkdown(htmlContent)).html;
  }

  // 如果是片段 HTML，包装成完整文档
  const wrappedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ${THEMES.default}
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `.trim();

  return wrappedHtml;
}

export default {
  renderMarkdown,
  applyTheme,
  previewRender,
};
