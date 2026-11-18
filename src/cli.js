#!/usr/bin/env node

/**
 * Obsidian 文库 CLI 工具
 * 
 * 用法:
 *   node src/cli.js list [--series "系列名"] [--sort name|size|time] [--limit N]
 *   node src/cli.js extract --file "文件名" [--output path]
 *   node src/cli.js search "搜索词" [--content]
 *   node src/cli.js stats
 *   node src/cli.js export [--output path]
 */

import VaultReader from './services/vault-reader.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置
const VAULT_PATH = 'G:\\Obsidian\\wechat\\桌面解构';
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * 格式化输出为表格
 */
function formatTable(data, columns) {
  if (data.length === 0) return '(无数据)';

  // 计算列宽
  const colWidths = {};
  columns.forEach(col => {
    colWidths[col] = col.length;
  });

  data.forEach(row => {
    columns.forEach(col => {
      const value = String(row[col] || '');
      colWidths[col] = Math.max(colWidths[col], value.length);
    });
  });

  // 生成表格
  const header = columns.map(col => col.padEnd(colWidths[col])).join(' | ');
  const separator = columns.map(col => '─'.repeat(colWidths[col])).join('─┼─');
  
  const rows = data.map(row => 
    columns.map(col => String(row[col] || '').padEnd(colWidths[col])).join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * 列出所有文档
 */
async function handleList(args) {
  const reader = new VaultReader(VAULT_PATH);
  
  const options = {};
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--series' && i + 1 < args.length) {
      options.series = args[++i];
    } else if (args[i] === '--sort' && i + 1 < args.length) {
      options.sort = args[++i];
    } else if (args[i] === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[++i], 10);
    }
    i++;
  }

  const docs = await reader.listDocuments(options);
  
  console.log(`\n📚 找到 ${docs.length} 篇文档\n`);
  
  const tableData = docs.map(d => ({
    '文件': d.filename,
    '标题': d.title.substring(0, 40),
    '系列': d.series || '—',
    '字数': d.wordCount,
    '读时': d.estimatedReadTime
  }));

  console.log(formatTable(tableData, ['文件', '标题', '系列', '字数', '读时']));
  console.log();
}

/**
 * 列出按系列分组的文档
 */
async function handleListBySeries() {
  const reader = new VaultReader(VAULT_PATH);
  const grouped = await reader.listBySeries();

  console.log(`\n📚 按系列分组 (${grouped.size} 个系列)\n`);

  for (const [series, docs] of grouped) {
    console.log(`\n📖 ${series} (${docs.length} 篇)`);
    console.log('─'.repeat(60));
    
    const tableData = docs.map((d, idx) => ({
      '#': (idx + 1).toString(),
      '标题': d.title.substring(0, 35),
      '字数': d.wordCount,
      '读时': d.estimatedReadTime
    }));

    console.log(formatTable(tableData, ['#', '标题', '字数', '读时']));
  }

  console.log();
}

/**
 * 提取单个文档
 */
async function handleExtract(args) {
  let filename = '';
  let outputPath = '';

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--file' && i + 1 < args.length) {
      filename = args[++i];
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[++i];
    }
    i++;
  }

  if (!filename) {
    console.error('❌ 需要指定 --file 参数');
    process.exit(1);
  }

  const reader = new VaultReader(VAULT_PATH);
  const doc = await reader.readDocument(filename);

  if (!doc) {
    console.error(`❌ 文档未找到: ${filename}`);
    process.exit(1);
  }

  console.log(`\n📄 ${doc.title}`);
  console.log('─'.repeat(60));
  console.log(`系列: ${doc.series || '(无)'}`);
  console.log(`字数: ${doc.wordCount}`);
  console.log(`读时: ${doc.estimatedReadTime}`);
  console.log('─'.repeat(60));
  console.log();
  console.log(doc.content);
  console.log();

  if (outputPath) {
    await reader.exportMarkdown(filename, outputPath);
    console.log(`✓ 已导出到: ${outputPath}\n`);
  }
}

/**
 * 搜索文档
 */
async function handleSearch(args) {
  const query = args[0];
  if (!query) {
    console.error('❌ 请提供搜索词');
    process.exit(1);
  }

  const options = {};
  if (args.includes('--content')) {
    options.searchContent = true;
  }
  if (args.includes('--limit')) {
    const idx = args.indexOf('--limit');
    if (idx + 1 < args.length) {
      options.limit = parseInt(args[idx + 1], 10);
    }
  }

  const reader = new VaultReader(VAULT_PATH);
  const results = await reader.search(query, options);

  console.log(`\n🔍 搜索 "${query}" - 找到 ${results.length} 个结果\n`);

  if (results.length === 0) {
    console.log('(无结果)\n');
    return;
  }

  const tableData = results.map(d => ({
    '文件': d.filename,
    '标题': d.title.substring(0, 40),
    '系列': d.series || '—',
    '字数': d.wordCount
  }));

  console.log(formatTable(tableData, ['文件', '标题', '系列', '字数']));
  console.log();
}

/**
 * 显示统计信息
 */
async function handleStats() {
  const reader = new VaultReader(VAULT_PATH);
  const stats = await reader.getVaultStats();

  console.log('\n📊 Vault 统计信息\n');
  console.log(`总文档数:     ${stats.totalDocuments} 篇`);
  console.log(`总字数:       ${stats.totalWords.toLocaleString('zh-CN')} 字`);
  console.log(`总大小:       ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`平均字数:     ${stats.averageWordCount} 字/篇`);
  console.log();
  console.log('按系列统计:');
  for (const [series, count] of stats.series) {
    console.log(`  • ${series}: ${count} 篇`);
  }
  console.log();
}

/**
 * 导出元数据
 */
async function handleExport(args) {
  const options = {};

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--output' && i + 1 < args.length) {
      options.outputPath = args[++i];
    }
    i++;
  }

  const reader = new VaultReader(VAULT_PATH);
  
  if (!options.outputPath) {
    options.outputPath = path.join(REPO_ROOT, 'vault-metadata.json');
  }

  const result = await reader.exportMetadata(options);
  console.log(`✓ 已导出元数据到: ${options.outputPath}\n`);
}

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
📚 Obsidian 文库 CLI 工具

用法:
  node src/cli.js <command> [options]

命令:
  list                 列出所有文档
    --series <name>    按系列过滤
    --sort name|size|time
    --limit <n>        限制结果数

  by-series            按系列分组显示

  extract --file <name>
    [--output <path>]  提取文档（可选导出到文件）

  search <query>       搜索文档
    [--content]        搜索内容（不仅搜索标题）
    [--limit <n>]      限制结果数

  stats                显示统计信息

  export [--output <path>]
                       导出元数据为 JSON

  help                 显示此帮助信息

示例:
  # 列出所有文档
  node src/cli.js list

  # 查看特定系列的文章
  node src/cli.js list --series "深度解构AI冷战"

  # 提取文章内容
  node src/cli.js extract --file "01 商业篇.md" --output output.md

  # 搜索文章
  node src/cli.js search "监管"

  # 查看统计
  node src/cli.js stats
`);
}

/**
 * 主程序入口
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    return;
  }

  try {
    const command = args[0];
    const restArgs = args.slice(1);

    switch (command) {
      case 'list':
        await handleList(restArgs);
        break;

      case 'by-series':
        await handleListBySeries();
        break;

      case 'extract':
        await handleExtract(restArgs);
        break;

      case 'search':
        await handleSearch(restArgs);
        break;

      case 'stats':
        await handleStats();
        break;

      case 'export':
        await handleExport(restArgs);
        break;

      default:
        console.error(`❌ 未知命令: ${command}\n`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 错误:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
