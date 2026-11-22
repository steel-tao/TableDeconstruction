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

// 静态文件服务
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

// ==================== Doocs 导入暂存接口（新增）====================
// 🆕 内存暂存最后一次导入的内容 + 消费记录
let lastImportData = { 
  content: '', 
  filename: '', 
  timestamp: null,
  importId: null
};

// 🆕 POST /api/doocs/import - 接收来自前端的文件内容
app.post('/api/doocs/import', (req, res) => {
  try {
    const { content, filename } = req.body;
    const importId = Date.now().toString();  // 🆕 生成唯一导入ID（时间戳）
    
    lastImportData = { 
      content, 
      filename, 
      timestamp: Date.now(),
      importId,
      ready: true
    };
    
    console.log(`[Import] 新文件暂存: ${filename}，importId: ${importId}`);
    
    res.json({ 
      success: true, 
      message: 'Content stored for Doocs import',
      importId,
      instructions: 'Frontend should reload iframe with this importId'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obsidian 批量导入只读接口（供 8800 顶层页面使用）
const OBSIDIAN_CORS_ORIGIN = 'http://127.0.0.1:8800';

const listVaultMarkdown = (dir, prefix = '', out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      listVaultMarkdown(fullPath, relPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const stats = fs.statSync(fullPath);
      out.push({ path: relPath, title: entry.name.slice(0, -3), mtime: stats.mtimeMs, size: stats.size });
    }
  }
  return out;
};

// 将相对路径解析到 Vault 内的 .md 文件；越界或非 .md 返回 null
const resolveVaultFile = (relPath) => {
  const fullPath = path.resolve(VAULT_PATH, relPath);
  if (!fullPath.startsWith(VAULT_PATH + path.sep) || !fullPath.endsWith('.md')) return null;
  return fullPath;
};

app.get('/api/obsidian/list', (req, res) => {
  res.header('Access-Control-Allow-Origin', OBSIDIAN_CORS_ORIGIN);
  try {
    res.json({ files: listVaultMarkdown(VAULT_PATH) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/obsidian/file', (req, res) => {
  res.header('Access-Control-Allow-Origin', OBSIDIAN_CORS_ORIGIN);
  const relPath = String(req.query.path || '');
  const fullPath = resolveVaultFile(relPath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'not found' });
  }
  try {
    res.json({ path: relPath, content: fs.readFileSync(fullPath, 'utf-8') });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 GET /api/doocs/import-data - 供 8800 读取暂存内容（带 CORS 头）
app.get('/api/doocs/import-data', (req, res) => {
  // 🆕 CORS 响应头：允许 8800 跨源访问
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8800');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.send(200);
  }
  
  // 🆕 查询字符串可能包含请求者期望的 importId（用于时间戳去重）
  const requestedImportId = req.query.importId;
  
  if (requestedImportId && lastImportData.importId !== requestedImportId) {
    console.log(`[Import] 请求的 importId (${requestedImportId}) 与当前不符 (${lastImportData.importId})，可能被覆盖`);
  }
  
  res.json({
    ...lastImportData,
    serverTimestamp: Date.now()
  });
});

// ==================== Doocs Storage API Proxy ====================
// 转发所有 /api/doocs/storage/* 请求到 Doocs 的 /api/storage/*
app.all('/api/doocs/storage/*', async (req, res) => {
  try {
    const targetPath = req.path.replace('/api/doocs/storage', '/api/storage');
    const targetUrl = `http://127.0.0.1:8800${targetPath}`;
    
    // 准备fetch选项
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // 收集请求体（仅非GET请求）
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve());
        req.on('error', reject);
        setTimeout(resolve, 3000); // 3秒超时保护
      });
      
      if (chunks.length > 0) {
        fetchOptions.body = Buffer.concat(chunks).toString('utf-8');
        console.log(`[PROXY] 请求体:`, fetchOptions.body);
      }
    }

    console.log(`[PROXY] ${req.method} ${targetUrl}`);
    const proxyRes = await fetch(targetUrl, fetchOptions);
    const resBody = await proxyRes.text();

    console.log(`[PROXY] ✅ ${proxyRes.status}`);
    console.log(`[PROXY] 响应体:`, resBody);

    // 转发响应
    res.status(proxyRes.status);
    proxyRes.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });
    
    res.send(resBody);
  } catch (error) {
    console.error(`[PROXY] ❌ Error:`, error);
    res.status(502).json({ error: 'Proxy error', details: error.message });
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
