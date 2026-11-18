#!/usr/bin/env node

/**
 * Obsidian → Doocs 自动化工具
 * 
 * 真正的集成：自动将 Obsidian 文章输入到 Doocs 编辑器
 * 
 * 用法:
 *   node src/obsidian-to-doocs.js --file "文件名.md"
 *   node src/obsidian-to-doocs.js --series "系列名" --index 1
 */

import VaultReader from './services/vault-reader.js';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAULT_PATH = 'G:\\Obsidian\\wechat\\桌面解构';
const DOOCS_URL = 'http://127.0.0.1:8800';

// 问题包装函数
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * 将文章内容输入到 Doocs 编辑器
 */
async function inputToDoocsEditor(page, content) {
  console.log('\n🔄 正在输入内容到 Doocs 编辑器...\n');
  
  // 查找编辑器 textarea
  const editor = page.locator('textarea, [contenteditable="true"], [data-language="markdown"]').first();
  
  if (!editor.count) {
    console.error('❌ 找不到编辑器元素');
    return false;
  }

  // 点击编辑器获得焦点
  await editor.click();
  await page.waitForTimeout(300);

  // 清空现有内容
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(300);

  // 通过 evaluate 直接设置内容（更快更可靠）
  await page.evaluate((text) => {
    const editors = document.querySelectorAll('textarea, [contenteditable="true"]');
    for (const ed of editors) {
      if (ed.offsetHeight > 0) { // 只设置可见的编辑器
        if (ed.tagName === 'TEXTAREA') {
          ed.value = text;
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          ed.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          ed.textContent = text;
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          ed.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }
    }
  }, content);

  await page.waitForTimeout(1000);

  console.log('✅ 内容已输入到编辑器');
  console.log('⏳ 等待实时预览更新...\n');
  
  await page.waitForTimeout(1500);

  return true;
}

/**
 * 等待 Doocs 服务就绪
 */
async function waitForDoocs(maxRetries = 10) {
  console.log(`🔍 检查 Doocs 服务: ${DOOCS_URL}\n`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(DOOCS_URL);
      if (response.ok) {
        console.log('✅ Doocs 服务已就绪\n');
        return true;
      }
    } catch (e) {
      // 继续重试
    }
    
    process.stdout.write(`   ⏳ 等待中... (${i + 1}/${maxRetries})\r`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * 取得用户选择的文章
 */
async function selectArticle() {
  const reader = new VaultReader(VAULT_PATH);
  const docs = await reader.listDocuments({ sort: 'time' });

  if (docs.length === 0) {
    console.error('❌ 找不到任何文章');
    process.exit(1);
  }

  console.clear();
  console.log('📖 选择要导入 Doocs 的文章:\n');

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
      console.log(`     ├─ 字数: ${doc.wordCount}`);
      console.log(`     └─ 文件: ${doc.filename}`);
      mapping.set(index, doc);
      index++;
    }
    console.log();
  }

  // 用户选择
  let selection = null;
  while (!selection) {
    const input = await ask(`👉 请输入序号 (1-${docs.length}): `);
    const num = parseInt(input, 10);
    if (mapping.has(num)) {
      selection = mapping.get(num);
    } else {
      console.log('❌ 无效的选择');
    }
  }

  return selection;
}

/**
 * 主程序
 */
async function main() {
  console.clear();
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              🔗 Obsidian → Doocs 自动化集成                    ║
║              自动将文章输入到 Doocs 编辑器                       ║
╚════════════════════════════════════════════════════════════════╝
`);

  try {
    // 1. 检查 Doocs 服务
    const doocsReady = await waitForDoocs();
    if (!doocsReady) {
      console.error('❌ Doocs 服务不可用');
      console.log('💡 请先启动 Doocs:');
      console.log('   node tools/doocs/node_modules/@doocs/md-cli/index.js --port 55885\n');
      process.exit(1);
    }

    // 2. 选择文章
    const article = await selectArticle();

    console.log(`✅ 已选择: ${article.title}`);
    console.log(`   字数: ${article.wordCount}`);
    console.log(`   系列: ${article.series || '(无)'}\n`);

    const confirm = await ask('确认导入此文章到 Doocs? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 已取消');
      process.exit(0);
    }

    // 3. 启动浏览器
    console.log('\n🚀 启动浏览器...\n');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    // 4. 打开 Doocs
    console.log(`📖 打开 Doocs: ${DOOCS_URL}\n`);
    await page.goto(DOOCS_URL);
    await page.waitForTimeout(2000);

    // 5. 输入内容到编辑器
    const success = await inputToDoocsEditor(page, article.content);

    if (!success) {
      console.error('❌ 输入失败');
      await browser.close();
      process.exit(1);
    }

    // 6. 显示成功消息
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      ✅ 导入成功！                              ║
╚════════════════════════════════════════════════════════════════╝

📄 文章信息:
   标题: ${article.title}
   字数: ${article.wordCount}
   阅读: ${article.estimatedReadTime}

✨ 现在您可以:
   1. 在右侧查看微信排版预览
   2. 调整样式和格式
   3. 验证排版效果
   4. 点击 Copy 按钮复制内容
   5. 粘贴到微信公众号后台

💡 提示:
   • 浏览器窗口保持打开，关闭此终端即可
   • 编辑内容时会自动保存到 localStorage
   • 使用 Ctrl+Z 撤销，Ctrl+Y 重做

🔗 Doocs 编辑器正在运行: ${DOOCS_URL}

按 Enter 关闭浏览器...
    `);

    await ask('');
    await browser.close();

    console.log('👋 完成!\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
