# Obsidian Vault Metadata Schema

本规范定义了项目内 Markdown 文档的 YAML Frontmatter 结构和解析规则。

## Schema 定义

```yaml
title: string              # 文章标题 (必需)
author: string             # 作者名 (可选)
tags: [string]            # 标签列表 (可选)
category: string          # 分类 (可选)
summary: string           # 摘要 (可选，不超过 200 字)
publish_date: ISO8601     # 计划发布日期 (可选)
published: boolean        # 是否已发布 (可选，默认 false)
weixin_media_id: string   # 微信 media_id (可选，已发布时填充)
weixin_url: string        # 微信发布链接 (可选)
attachments: [string]     # 关联的本地图片/资源 (可选，相对路径)
```

## 示例

```yaml
---
title: "微观结构：1000人手工数据库与高端服务业的'技术壁垒'"
author: "桌面解构"
tags: ["日本政治", "数据管理", "高端服务"]
category: "深度解构"
summary: "通过白坂亚纪的1000人手工CRM系统，剖析高端服务业的真实微观结构。"
publish_date: 2024-09-23
published: false
attachments: []
---

# 文章标题

文章正文 Markdown 内容...
```

## 解析规则

1. 所有文档必须包含 `title` 字段
2. Frontmatter 使用 YAML 格式，用 `---` 分隔
3. 如果文档缺少 Frontmatter，使用 Markdown H1/H2 作为备选标题
4. `attachments` 中的路径相对于文档所在目录
5. `published` 为 true 时，必须同时包含 `weixin_media_id`

## 字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| title | string | 发布到微信的文章标题 | "深度解构" |
| author | string | 公众号署名作者 | "桌面解构" |
| tags | array | 便于本地管理的标签 | ["政治", "经济"] |
| category | string | 内容分类，便于组织 | "解构系列" |
| summary | string | 微信列表预览摘要 | "..." |
| publish_date | string | ISO 格式日期或定时发布目标 | "2024-09-23" |
| published | boolean | 是否已通过微信发布 | true/false |
| weixin_media_id | string | 微信回复的素材 media_id | "xxx" |
| weixin_url | string | 微信最终发布的链接 | "https://mp.weixin.qq.com/..." |
| attachments | array | 本地资源路径列表 | ["./images/fig1.png"] |

## 后续扩展

- `reading_time`: 预估阅读时间（分钟）
- `word_count`: 字数统计
- `last_modified`: 最后编辑时间
- `revision`: 版本号或修订记录
