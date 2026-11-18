import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Obsidian Vault 路径
const VAULT_PATH = 'G:\\Obsidian\\wechat\\桌面解构';

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: 获取文件列表
app.get('/api/files', (req, res) => {
  try {
    const files = [];
    const walkDir = (dir, series = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath, entry.name);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const stats = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const wordCount = content.length;
          
          files.push({
            filename: entry.name,
            filepath: fullPath,
            series: series || '(无系列)',
            wordCount: wordCount,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    };
    
    walkDir(VAULT_PATH);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 获取单个文件内容
app.get('/api/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 防止目录遍历
    if (filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // 查找文件
    let filepath = '';
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name === filename) {
          filepath = fullPath;
        }
      }
    };
    
    walkDir(VAULT_PATH);
    
    if (!filepath) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(filepath, 'utf-8');
    res.json({ 
      filename,
      filepath,
      content,
      wordCount: content.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 保存文件
app.post('/api/file/save', (req, res) => {
  try {
    const { filepath, content } = req.body;
    
    if (!filepath || !content) {
      return res.status(400).json({ error: 'Missing filepath or content' });
    }
    
    // 防止目录遍历
    if (filepath.includes('..')) {
      return res.status(400).json({ error: 'Invalid filepath' });
    }
    
    fs.writeFileSync(filepath, content, 'utf-8');
    res.json({ success: true, message: 'File saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n📁 文件管理器已启动`);
  console.log(`📂 Vault 路径: ${VAULT_PATH}`);
  console.log(`🌐 访问地址: http://127.0.0.1:${PORT}`);
  console.log(`\n[DOOCS]   Doocs 编辑器: http://127.0.0.1:8800`);
  console.log(`\n`);
});
