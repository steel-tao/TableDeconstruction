const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 启动 Doocs CLI
let doocProcess;
let doocPort = 52269; // 默认尝试这个端口

console.log('🚀 启动 Doocs 编辑器...');

// 启动 @doocs/md-cli
const doocsCli = path.join(__dirname, 'node_modules/@doocs/md-cli/index.js');
doocProcess = spawn('node', [doocsCli, '--port', doocPort.toString()], {
  stdio: 'pipe',
  cwd: __dirname
});

let actualPort = doocPort;

// 解析实际端口
doocProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // 提取实际使用的端口
  const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
  if (match) {
    actualPort = parseInt(match[1]);
  }
});

doocProcess.stderr.on('data', (data) => {
  console.error(`Doocs Error: ${data}`);
});

// 创建代理服务器
const proxyPort = 8800; // 使用与 Doocs CLI 相同的端口
const proxyServer = http.createServer((req, res) => {
  // 代理请求到实际的 Doocs
  const options = {
    hostname: '127.0.0.1',
    port: actualPort,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // 如果是主页面，注入 localStorage 读取脚本
    if (req.url === '/' && proxyRes.headers['content-type']?.includes('text/html')) {
      let body = '';
      
      proxyRes.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      proxyRes.on('end', () => {
        // 删除原始的 Content-Length 头
        delete proxyRes.headers['content-length'];
        
        // 注入脚本
        const injectedScript = `
<script>
// 自动从 localStorage 读取并填充 Doocs 编辑器
(function() {
  const content = localStorage.getItem('_obsidian_import_content');
  const filename = localStorage.getItem('_obsidian_import_filename');
  
  if (content) {
    console.log('[Obsidian Integration] Found content in localStorage, attempting to fill editor');
    
    // 多次尝试填充编辑器，因为 Doocs 可能需要时间加载
    let attempts = 0;
    const maxAttempts = 20;
    
    const fillEditor = () => {
      attempts++;
      
      // 尝试找到编辑器的 textarea 或 contenteditable
      const editors = document.querySelectorAll('textarea, [contenteditable="true"]');
      
      if (editors.length > 0) {
        const editor = editors[0];
        
        if (editor.tagName === 'TEXTAREA') {
          editor.value = content;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          editor.innerHTML = content;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // 清除 localStorage
        localStorage.removeItem('_obsidian_import_content');
        localStorage.removeItem('_obsidian_import_filename');
        
        console.log('[Obsidian Integration] Content filled successfully');
        return true;
      } else if (attempts < maxAttempts) {
        setTimeout(fillEditor, 500);
      } else {
        console.log('[Obsidian Integration] Could not find editor after 10 seconds');
      }
    };
    
    // 页面加载完成后开始填充
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fillEditor);
    } else {
      fillEditor();
    }
  }
})();
</script>
`;
        
        // 在 </body> 前注入脚本
        body = body.replace('</body>', injectedScript + '</body>');
        
        // 设置新的响应头，删除原始的 Content-Length
        const headers = { ...proxyRes.headers };
        delete headers['content-length'];
        
        res.writeHead(proxyRes.statusCode, headers);
        res.end(body);
      });
    } else {
      // 其他请求直接传递
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });
  
  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Service unavailable');
  });
  
  req.pipe(proxyReq);
});

proxyServer.listen(proxyPort, '127.0.0.1', () => {
  console.log(`\n✅ Doocs 代理服务器已启动`);
  console.log(`📝 访问地址: http://127.0.0.1:${proxyPort}`);
  console.log(`🔌 Doocs 实际端口: ${actualPort}`);
  console.log(`\nℹ️  功能:`);
  console.log(`   - 在 Doocs 页面中自动填充 Obsidian 文件内容`);
  console.log(`   - 从 localStorage 读取: _obsidian_import_content`);
  console.log(`\n`);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n🛑 关闭服务器...');
  proxyServer.close();
  if (doocProcess) {
    doocProcess.kill();
  }
  process.exit(0);
});
