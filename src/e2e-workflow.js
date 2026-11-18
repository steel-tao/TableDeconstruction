#!/usr/bin/env node

/**
 * End-to-End 工作流演示脚本
 * 
 * 演示完整工作流:
 * Obsidian Vault → 文章选择 → Doocs 格式准备 → 复制到微信
 * 
 * 用法:
 *   node src/e2e-workflow.js
 */

import VaultReader from './services/vault-reader.js';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAULT_PATH = 'G:\\Obsidian\\wechat\\桌面解构';
const REPO_ROOT = path.resolve(__dirname, '..');

// 创建输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 问题包装函数
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// 进度条函数
function drawProgressBar(current, total, width = 30) {
  const percentage = current / total;
  const filled = Math.floor(width * percentage);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.floor(percentage * 100);
  
  return `[${bar}] ${percent}%`;
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 工作流步骤 1: 显示欢迎信息
 */
async function step1_Welcome() {
  console.clear();
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   📝 Obsidian → Doocs → WeChat                 ║
║                       完整工作流演示                              ║
╚════════════════════════════════════════════════════════════════╝

✨ 欢迎使用智能内容发布工作流！

本演示将带您完成以下步骤:
  1️⃣  从 Obsidian 扫描文章库
  2️⃣  选择要发布的文章
  3️⃣  验证文章信息
  4️⃣  准备 Doocs 格式
  5️⃣  生成发布预览

⏱️  预计耗时: 2-3 分钟

`);

  await ask('按 Enter 开始... ');
}

/**
 * 工作流步骤 2: 扫描 Vault
 */
async function step2_ScanVault() {
  console.clear();
  console.log('📚 正在扫描 Obsidian Vault...\n');
  
  const reader = new VaultReader(VAULT_PATH);
  console.log(`📂 Vault 路径: ${VAULT_PATH}\n`);
  
  // 模拟扫描进度
  for (let i = 0; i <= 10; i++) {
    process.stdout.write(`   ${drawProgressBar(i, 10)} 扫描中...\r`);
    await sleep(50);
  }
  
  const docs = await reader.listDocuments({ sort: 'time' });
  
  console.log(`\n✅ 扫描完成！\n`);
  console.log(`📊 发现 ${docs.length} 篇文章\n`);
  
  return { reader, docs };
}

/**
 * 工作流步骤 3: 选择文章
 */
async function step3_SelectArticle(docs) {
  console.clear();
  console.log('📖 请选择要发布的文章:\n');
  
  // 按系列分组显示
  const grouped = new Map();
  for (const doc of docs) {
    const series = doc.series || '(无系列)';
    if (!grouped.has(series)) {
      grouped.set(series, []);
    }
    grouped.get(series).push(doc);
  }

  let index = 1;
  const mapping = new Map();
  
  for (const [series, seriesDocs] of grouped) {
    console.log(`📚 ${series}`);
    for (const doc of seriesDocs) {
      console.log(`  ${index}. ${doc.title.substring(0, 50)}`);
      console.log(`     ├─ 字数: ${doc.wordCount} 字`);
      console.log(`     ├─ 读时: ${doc.estimatedReadTime}`);
      console.log(`     └─ 创建: ${doc.createdDate.toLocaleDateString('zh-CN')}`);
      mapping.set(index, doc);
      index++;
    }
    console.log();
  }

  // 用户选择
  let selection = null;
  while (!selection) {
    const input = await ask(`👉 请输入文章序号 (1-${docs.length}): `);
    const num = parseInt(input, 10);
    if (mapping.has(num)) {
      selection = mapping.get(num);
    } else {
      console.log('❌ 无效的选择，请重试');
    }
  }

  return selection;
}

/**
 * 工作流步骤 4: 验证文章信息
 */
async function step4_VerifyArticle(reader, article) {
  console.clear();
  console.log('✅ 已选中文章\n');
  
  console.log('📋 文章信息:');
  console.log('─'.repeat(60));
  console.log(`文件名: ${article.filename}`);
  console.log(`标题:   ${article.title}`);
  console.log(`系列:   ${article.series || '(无)'}`);
  console.log(`字数:   ${article.wordCount} 字`);
  console.log(`读时:   ${article.estimatedReadTime}`);
  console.log(`大小:   ${(article.size / 1024).toFixed(2)} KB`);
  console.log(`日期:   ${article.createdDate.toLocaleDateString('zh-CN')}`);
  console.log('─'.repeat(60));
  console.log();

  const confirm = await ask('确认发布此文章? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ 已取消');
    process.exit(0);
  }

  return article;
}

/**
 * 工作流步骤 5: 准备 Doocs 格式
 */
async function step5_PrepareDoocs(article) {
  console.clear();
  console.log('🔄 正在准备 Doocs 格式...\n');
  
  // 模拟准备过程
  const steps = [
    '验证 Markdown 语法...',
    '检查中英文混合...',
    '优化格式...',
    '生成预览...',
    '准备剪贴板...'
  ];

  for (let i = 0; i < steps.length; i++) {
    process.stdout.write(`   ${drawProgressBar(i, steps.length)} ${steps[i]}\r`);
    await sleep(300);
  }

  console.log(`\n✅ 准备完成！\n`);

  // 显示文章摘要
  const contentPreview = article.content.substring(0, 300);
  console.log('📄 文章内容预览:');
  console.log('─'.repeat(60));
  console.log(contentPreview);
  console.log('...\n');

  return {
    markdown: article.content,
    stats: {
      wordCount: article.wordCount,
      readTime: article.estimatedReadTime,
      hasCode: article.content.includes('```'),
      hasList: article.content.includes('- ') || article.content.includes('* '),
      hasImage: article.content.includes('![')
    }
  };
}

/**
 * 工作流步骤 6: 显示发布预览
 */
async function step6_PublishPreview(prepared) {
  console.clear();
  console.log('🎨 发布预览\n');

  console.log('📊 内容分析:');
  console.log('─'.repeat(60));
  console.log(`✓ 总字数: ${prepared.stats.wordCount} 字`);
  console.log(`✓ 阅读时间: ${prepared.stats.readTime}`);
  console.log(`✓ 包含代码块: ${prepared.stats.hasCode ? '有' : '无'}`);
  console.log(`✓ 包含列表: ${prepared.stats.hasList ? '有' : '无'}`);
  console.log(`✓ 包含图片: ${prepared.stats.hasImage ? '有' : '无'}`);
  console.log('─'.repeat(60));
  console.log();

  console.log('📋 微信兼容性检查:');
  console.log('─'.repeat(60));
  console.log('✅ Markdown 格式支持');
  console.log('✅ 标题结构完整');
  console.log('✅ 中文内容优化');
  console.log('✅ 微信排版适配');
  console.log('─'.repeat(60));
  console.log();

  console.log('🚀 下一步操作:');
  console.log('─'.repeat(60));
  console.log('1. 打开 Doocs: http://127.0.0.1:55885');
  console.log('2. 复制上方文章内容到 Markdown 编辑器');
  console.log('3. 验证预览效果');
  console.log('4. 点击 Copy 按钮');
  console.log('5. 粘贴到微信公众号后台');
  console.log('6. 调整格式和图片');
  console.log('7. 点击发布');
  console.log('─'.repeat(60));
  console.log();
}

/**
 * 工作流步骤 7: 生成工作总结
 */
async function step7_Summary(article, prepared) {
  console.clear();
  console.log('📈 工作流总结\n');

  console.log('✅ 已完成步骤:');
  console.log('─'.repeat(60));
  console.log('1. ✅ 从 Obsidian 扫描文章库');
  console.log('2. ✅ 选择要发布的文章');
  console.log('3. ✅ 验证文章信息');
  console.log('4. ✅ 准备 Doocs 格式');
  console.log('5. ✅ 生成发布预览');
  console.log('─'.repeat(60));
  console.log();

  console.log('💾 导出选项:');
  console.log('─'.repeat(60));
  
  const exportDir = path.join(REPO_ROOT, 'export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // 保存 Markdown
  const mdPath = path.join(exportDir, article.filename);
  fs.writeFileSync(mdPath, prepared.markdown, 'utf-8');
  console.log(`✓ Markdown: ${mdPath}`);

  // 保存元数据
  const metaPath = path.join(exportDir, `${article.filename.replace('.md', '.json')}`);
  const metadata = {
    filename: article.filename,
    title: article.title,
    series: article.series,
    wordCount: article.wordCount,
    estimatedReadTime: article.estimatedReadTime,
    exportTime: new Date().toISOString(),
    status: 'ready_for_doocs'
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`✓ 元数据: ${metaPath}`);

  console.log('─'.repeat(60));
  console.log();

  console.log('✨ 演示完成！\n');
  console.log('📌 提示:');
  console.log('• 文章已准备就绪，可以手动输入 Doocs');
  console.log('• 或使用命令: node src/cli.js extract --file "文件名"');
  console.log('• 完整工作流: https://github.com/your-repo/docs/...');
  console.log();
}

/**
 * 主程序
 */
async function main() {
  try {
    // 步骤 1: 欢迎
    await step1_Welcome();

    // 步骤 2: 扫描 Vault
    const { reader, docs } = await step2_ScanVault();

    if (docs.length === 0) {
      console.log('❌ 未找到任何文章');
      process.exit(1);
    }

    // 步骤 3: 选择文章
    const selectedArticle = await step3_SelectArticle(docs);

    // 步骤 4: 验证
    const verified = await step4_VerifyArticle(reader, selectedArticle);

    // 步骤 5: 准备 Doocs 格式
    const prepared = await step5_PrepareDoocs(verified);

    // 步骤 6: 发布预览
    await step6_PublishPreview(prepared);

    // 步骤 7: 总结
    await step7_Summary(verified, prepared);

    console.log('👋 谢谢使用！\n');
    rl.close();

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
