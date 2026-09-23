/**
 * @file src/types/index.ts
 * @description TypeScript类型定义
 */

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * 文件信息
 */
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modifiedTime: number;
  createdTime: number;
}

/**
 * 操作结果
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
