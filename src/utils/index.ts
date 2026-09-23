/**
 * @file src/utils/index.ts
 * @description 通用工具函数
 */

import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 生成时间戳
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 读取JSON文件
 */
export function readJsonFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 写入JSON文件
 */
export function writeJsonFile(filePath: string, data: any): void {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 延迟执行
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试机制
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * 深层合并对象
 */
export function deepMerge(target: any, source: any): any {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

/**
 * 检查是否为对象
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export default {
  generateId,
  getTimestamp,
  readJsonFile,
  writeJsonFile,
  sleep,
  retry,
  deepMerge,
};
