#!/usr/bin/env node

/**
 * Obsidian 文件管理器服务
 * 
 * 功能:
 * 1. 浏览 Obsidian Vault 中的所有 Markdown 文件
 * 2. 显示文件列表（按系列分组）
 * 3. 打开文件到 Doocs 编辑器
 * 4. 保存修改回 Obsidian 文件
 * 
 * 端口: 3000
 * URL: http://127.0.0.1:3000
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAULT_PATH = 'G:\\Obsidian\\wechat\\桌面解构';
const PORT = 3000;
const DOOCS_URL = 'http://127.0.0.1:8800';

const app = express();

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 扫描 Vault 获取所有文件
 */
function scanVault() {
  const files = [];
  
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const filename = entry.name;
          
          // 提取标题
          const titleMatch = content.match(/^#+\s+(.+?)$/m);
          const title = titleMatch ? titleMatch[1].trim() : filename;
          
          // 计算字数
          const wordCount = content.length;
          
          // 提取系列
          const dirMatch = fullPath.match(/桌面解构\\([^\\]+)\\/);
          const series = dirMatch ? dirMatch[1] : '(无系列)';
          
          files.push({
            filename,
            filepath: fullPath,
            title,
            series,
            wordCount,
            size: fs.statSync(fullPath).size
          });
        } catch (error) {
          console.error(`Failed to parse ${fullPath}:`, error.message);
        }
      }
    }
  }

  walk(VAULT_PATH);
  return files;
}

/**
 * API: 获取文件列表（按系列分组）
 */
app.get('/api/files', (req, res) => {
  try {
    const files = scanVault();
    
    // 按系列分组
    const grouped = {};
    for (const file of files) {
      const series = file.series;
      if (!grouped[series]) {
        grouped[series] = [];
      }
      grouped[series].push(file);
    }
    
    // 每个系列内按名称排序
    for (const series in grouped) {
      grouped[series].sort((a, b) => a.filename.localeCompare(b.filename));
    }
    
    res.json({
      success: true,
      totalFiles: files.length,
      grouped,
      vaultPath: VAULT_PATH
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: 读取文件内容
 */
app.get('/api/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    
    // 搜索文件
    let filepath = null;
    const files = scanVault();
    for (const file of files) {
      if (file.filename === decodedFilename) {
        filepath = file.filepath;
        break;
      }
    }
    
    if (!filepath) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const content = fs.readFileSync(filepath, 'utf-8');
    const fileInfo = files.find(f => f.filepath === filepath);
    
    res.json({
      success: true,
      filename: decodedFilename,
      filepath,
      content,
      title: fileInfo?.title || decodedFilename,
      series: fileInfo?.series || '(无系列)',
      wordCount: fileInfo?.wordCount || content.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: 保存文件内容
 */
app.post('/api/file/save', (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename or content'
      });
    }
    
    // 搜索文件
    const files = scanVault();
    const fileInfo = files.find(f => f.filename === filename);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // 保存文件
    fs.writeFileSync(fileInfo.filepath, content, 'utf-8');
    
    res.json({
      success: true,
      message: `File saved: ${filename}`,
      filepath: fileInfo.filepath,
      size: content.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: 获取 Doocs 编辑器状态
 */
app.get('/api/doocs-status', async (req, res) => {
  try {
    // 检查 Doocs 是否运行
    const response = await fetch(`${DOOCS_URL}/`, { timeout: 2000 });
    const isRunning = response.ok;
    
    res.json({
      success: true,
      isRunning,
      url: DOOCS_URL
    });
  } catch (error) {
    res.json({
      success: true,
      isRunning: false,
      url: DOOCS_URL,
      error: error.message
    });
  }
});

/**
 * 启动服务器
 */
function startServer() {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║     📁 Obsidian 文件管理器已启动           ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
    
    console.log(`🌐 Web 界面: http://127.0.0.1:${PORT}`);
    console.log(`📚 Vault 路径: ${VAULT_PATH}`);
    console.log(`🎨 Doocs 编辑器: ${DOOCS_URL}`);
    console.log(`\n按 Ctrl+C 停止服务\n`);
  });
}

// 启动
startServer();

process.on('SIGINT', () => {
  console.log('\n✓ 文件管理器已停止');
  process.exit(0);
});
