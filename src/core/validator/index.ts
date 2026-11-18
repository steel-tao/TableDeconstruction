/**
 * @file src/core/validator/index.ts
 * @description 内容验证模块：检查合规性、规范化内容
 */

export interface ValidationResult {
  // 是否通过验证
  passed: boolean;
  // 错误列表
  errors: ValidationError[];
  // 警告列表
  warnings: ValidationWarning[];
  // 验证时间
  timestamp: Date;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

// ============================================================================
// 敏感词库（可扩展）
// ============================================================================

const SENSITIVE_WORDS = [
  '测试禁词', // 示例
];

const CONTENT_RULES = {
  minLength: 10,
  maxLength: 50000,
  maxHeadings: 50,
  maxLinks: 100,
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

// ============================================================================
// 校验函数
// ============================================================================

/**
 * 验证 Markdown 文件
 */
export async function validateMarkdownFile(
  filePath: string,
  content: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. 检查基本格式
  if (!content || content.trim().length === 0) {
    errors.push({
      code: 'EMPTY_CONTENT',
      message: '文件内容为空',
      severity: 'error',
    });
  }

  // 2. 检查长度限制
  if (content.length < CONTENT_RULES.minLength) {
    errors.push({
      code: 'TOO_SHORT',
      message: `内容过短，至少需要 ${CONTENT_RULES.minLength} 个字符，当前 ${content.length} 个`,
      severity: 'error',
    });
  }

  if (content.length > CONTENT_RULES.maxLength) {
    errors.push({
      code: 'TOO_LONG',
      message: `内容过长，不能超过 ${CONTENT_RULES.maxLength} 个字符，当前 ${content.length} 个`,
      severity: 'error',
    });
  }

  // 3. 检查标题数量
  const headings = content.match(/^#{1,6}\s+/gm) || [];
  if (headings.length > CONTENT_RULES.maxHeadings) {
    warnings.push({
      code: 'TOO_MANY_HEADINGS',
      message: `标题数量过多（${headings.length}），建议不超过 ${CONTENT_RULES.maxHeadings} 个`,
    });
  }

  // 4. 检查链接数量
  const links = content.match(/\[.*?\]\(.*?\)/g) || [];
  if (links.length > CONTENT_RULES.maxLinks) {
    warnings.push({
      code: 'TOO_MANY_LINKS',
      message: `链接数量过多（${links.length}），建议不超过 ${CONTENT_RULES.maxLinks} 个`,
    });
  }

  // 5. 检查图片链接
  const images = content.match(/!\[.*?\]\(.*?\)/g) || [];
  for (const image of images) {
    // 提取路径
    const match = image.match(/!\[.*?\]\((.*?)\)/);
    if (match) {
      const imagePath = match[1];
      
      // 检查本地路径是否需要转换
      if (imagePath.startsWith('../') || imagePath.startsWith('/')) {
        warnings.push({
          code: 'LOCAL_IMAGE_PATH',
          message: `检测到本地图片路径 "${imagePath}"，确保已上传到云服务`,
        });
      }
      
      // 检查远程 URL 合法性
      if (imagePath.startsWith('http')) {
        try {
          new URL(imagePath);
        } catch {
          errors.push({
            code: 'INVALID_IMAGE_URL',
            message: `无效的图片 URL: ${imagePath}`,
            severity: 'error',
          });
        }
      }
    }
  }

  // 6. 检查合规性
  const complianceCheck = await checkContentCompliance(content);
  if (!complianceCheck) {
    errors.push({
      code: 'CONTENT_NOT_COMPLIANT',
      message: '内容包含不合规词汇或内容',
      severity: 'error',
    });
  }

  // 7. 检查特殊字符处理
  const specialCharIssues = checkSpecialCharacters(content);
  errors.push(...specialCharIssues);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date(),
  };
}

/**
 * 检查内容合规性
 */
export async function checkContentCompliance(content: string): Promise<boolean> {
  // 检查敏感词
  for (const word of SENSITIVE_WORDS) {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      return false;
    }
  }

  // 检查过度重复（垃圾内容检测）
  const lines = content.split('\n');
  const lineFreq = new Map<string, number>();
  for (const line of lines) {
    if (line.trim().length > 20) {
      const count = (lineFreq.get(line) || 0) + 1;
      lineFreq.set(line, count);
      if (count > 5) {
        // 相同行出现超过 5 次，可能是垃圾内容
        return false;
      }
    }
  }

  return true;
}

/**
 * 检查特殊字符
 */
function checkSpecialCharacters(content: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // 检查不匹配的括号
  const openParen = (content.match(/\(/g) || []).length;
  const closeParen = (content.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    errors.push({
      code: 'UNMATCHED_PARENTHESES',
      message: `不匹配的括号：${openParen} 个 ( vs ${closeParen} 个 )`,
      severity: 'warning',
    });
  }

  // 检查不匹配的引号
  const singleQuotes = (content.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    errors.push({
      code: 'UNMATCHED_QUOTES',
      message: '单引号数量不匹配',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * 清理和规范化内容
 */
export async function normalizeContent(content: string): Promise<string> {
  let normalized = content;

  // 1. 统一换行符
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. 移除尾部空白
  normalized = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // 3. 移除多余空行（保持最多连续 2 个空行）
  normalized = normalized.replace(/\n\n\n+/g, '\n\n');

  // 4. 移除首尾空白行
  normalized = normalized.trim();

  // 5. 转换 Obsidian 本地图片路径为占位符
  normalized = normalized.replace(
    /!\[(.*?)\]\((?!http)(.*?)\)/g,
    '![$1](image_$2)'
  );

  // 6. 规范化列表格式（确保列表项前有空行）
  normalized = normalized.replace(/^([-*+])/gm, '\n$1').trim();

  return normalized;
}

export default {
  validateMarkdownFile,
  checkContentCompliance,
  normalizeContent,
};
