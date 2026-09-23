/**
 * @file src/models/index.ts
 * @description 数据模型定义
 */

export interface Article {
  id: string;
  // 标题
  title: string;
  // 内容
  content: string;
  // 摘要
  summary: string;
  // 作者
  author: string;
  // 分类
  category: string;
  // 标签
  tags: string[];
  // 发布状态
  status: 'draft' | 'published' | 'archived';
  // 创建时间
  createdAt: Date;
  // 更新时间
  updatedAt: Date;
  // 发布时间
  publishedAt?: Date;
  // Obsidian文件路径
  sourcePath: string;
}

export interface Config {
  // 配置ID
  id: string;
  // 配置类型
  type: 'wechat' | 'obsidian' | 'system';
  // 配置值
  value: Record<string, any>;
  // 创建时间
  createdAt: Date;
  // 更新时间
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  // 操作类型
  action: string;
  // 操作者
  operator: string;
  // 操作目标
  targetId: string;
  // 操作详情
  details: Record<string, any>;
  // 操作时间
  timestamp: Date;
  // 操作结果
  result: 'success' | 'failure';
  // 错误信息
  error?: string;
}

export interface User {
  id: string;
  // 用户名
  username: string;
  // 邮箱
  email: string;
  // 角色
  role: 'admin' | 'editor' | 'reviewer' | 'viewer';
  // 是否活跃
  isActive: boolean;
  // 创建时间
  createdAt: Date;
  // 最后登录
  lastLogin?: Date;
}
