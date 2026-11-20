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
doocProcess = spawn('node', [doocsCli, 'port=' + doocPort.toString()], {
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
    // 🔧 如果是主页面，注入脚本（在初始请求和 reload 请求时都注入，让脚本能持续检查新数据）
    const pathWithoutQuery = req.url.split('?')[0];
    if (pathWithoutQuery === '/' && proxyRes.headers['content-type']?.includes('text/html')) {
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
(function() {
  console.log('[Obsidian Init] 检查导入内容...');
  
  let content = localStorage.getItem('_obsidian_import_content');
  let filename = localStorage.getItem('_obsidian_import_filename');
  let lastImportId = null;
  
  // 🔧 如果 localStorage 没有，尝试从 3000 读取暂存内容
  if (!content) {
    console.log('[Obsidian Init] 从 3000 读取最新暂存内容');
    fetch('http://127.0.0.1:3000/api/doocs/import-data', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        if (data.content) {
          console.log('[Obsidian Init] 获取新内容，importId:', data.importId);
          content = data.content;
          filename = data.filename;
          lastImportId = data.importId;
          fillEditor();
        } else {
          console.log('[Obsidian Init] 暂存区无新内容');
        }
      })
      .catch(e => {
        console.log('[Obsidian Init] 读取暂存失败（正常，可能是首次或跨域问题）:', e.message);
        fillEditor();  // 仍尝试从 localStorage 填充
      });
  } else {
    console.log('[Obsidian Init] localStorage 中已有内容，等待 1 秒确保 Doocs 应用挂载后填充');
    setTimeout(() => {
      console.log('[Obsidian Init] localStorage 路径：开始填充编辑器');
      fillEditor();
    }, 1000);
  }
  
  const CM_SELECTOR = '.cm-editor .cm-content[contenteditable="true"]';
  function probeOk(cm) {
    const last = content.split('\\n').map(l => l.trim()).filter(Boolean).pop();
    if (!last) return false;
    return cm.textContent.includes(last.slice(-20));
  }
  function writeCM(cm) {
    cm.focus();
    const range = document.createRange();
    range.selectNodeContents(cm);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return document.execCommand('insertText', false, content);
  }
  function guardCM(ticks, stable) {
    if (ticks >= 6 || stable >= 2) return;
    setTimeout(() => {
      const cm = document.querySelector(CM_SELECTOR);
      if (!cm || !cm.isConnected || cm.offsetParent === null) return;
      const ok = probeOk(cm);
      if (!ok) {
        console.log('[Obsidian Init] 内容被覆盖，第 ' + (ticks + 1) + ' 次重写');
        writeCM(cm);
      }
      guardCM(ticks + 1, ok ? stable + 1 : 0);
    }, 500);
  }

  // 🔧 完整的 fillEditor 实现（支持多种编辑器）
  function fillEditor() {
    if (!content) {
      console.log('[Obsidian Init] 无导入内容，停止填充');
      return;
    }
    
    console.log('[Obsidian Init] 开始填充编辑器，内容长度:', content.length);
    
    let attempts = 0;
    const maxAttempts = 50;  // 🔧 最多重试 50 次（25 秒）
    
    const tryFill = () => {
      attempts++;
      if (attempts <= 3 || attempts % 10 === 0) {
        console.log('[Obsidian Init] 第 ' + attempts + '/' + maxAttempts + ' 次尝试查找编辑器，当前内容长度: ' + content.length);
      }
      
      let targetEditor = null;
      
      // 🔧 策略 1a: CodeMirror 6，经输入管线写入以同步编辑器状态
      const cm6Content = document.querySelector(CM_SELECTOR);
      if (cm6Content && cm6Content.isConnected && cm6Content.offsetParent !== null) {
        writeCM(cm6Content);
        if (probeOk(cm6Content)) {
          console.log('[Obsidian Init] ✅ CM6 输入管线写入成功，内容长度:', content.length);
          targetEditor = cm6Content;
        }
      }
      
      // 🔧 策略 1b: CodeMirror 5（旧版本）
      if (!targetEditor) {
        const cm5Editor = document.querySelector('.CodeMirror');
        if (cm5Editor && cm5Editor.CodeMirror) {
          console.log('[Obsidian Init] 检测到 CodeMirror 5 编辑器');
          try {
            cm5Editor.CodeMirror.setValue(content);
            cm5Editor.CodeMirror.clearHistory();
            console.log('[Obsidian Init] ✅ CM5 setValue 成功，内容长度:', content.length);
            targetEditor = cm5Editor.CodeMirror;
          } catch (e) {
            console.log('[Obsidian Init] CM5 setValue 失败:', e.message);
          }
        }
      }
      
      // 🔧 策略 2: 原生 textarea
      if (!targetEditor) {
        const textareas = document.querySelectorAll('textarea');
        for (let ta of textareas) {
          if (ta.offsetParent !== null && ta.style.display !== 'none') {
            console.log('[Obsidian Init] 检测到可见 textarea，尝试填充，内容长度:', content.length);
            ta.value = content;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            ta.focus();
            console.log('[Obsidian Init] ✅ textarea 填充成功，内容长度:', content.length);
            targetEditor = ta;
            break;
          }
        }
      }
      
      // 🔧 策略 3: contenteditable（仅在无 CM6 时兜底）
      if (!targetEditor && !document.querySelector('.cm-editor')) {
        const editables = document.querySelectorAll('[contenteditable="true"]');
        for (let ed of editables) {
          if (ed.offsetParent !== null && ed.style.display !== 'none') {
            console.log('[Obsidian Init] 检测到 contenteditable，尝试填充，内容长度:', content.length);
            ed.innerText = content;
            ed.dispatchEvent(new Event('input', { bubbles: true }));
            ed.dispatchEvent(new Event('change', { bubbles: true }));
            ed.focus();
            console.log('[Obsidian Init] ✅ contenteditable 填充成功，内容长度:', content.length);
            targetEditor = ed;
            break;
          }
        }
      }
      
      // 🔧 成功填充则记录 importId 并清空 localStorage
      if (targetEditor) {
        console.log('[Obsidian Init] ✅✅✅ 内容填充成功，importId:', lastImportId, '，内容长度:', content.length);
        localStorage.removeItem('_obsidian_import_content');
        localStorage.removeItem('_obsidian_import_filename');
        guardCM(0, 0);
        return true;
      }
      
      // 未找到编辑器，继续重试
      if (attempts < maxAttempts) {
        const delayMs = attempts > 20 ? 1000 : 500;
        if (attempts <= 3 || attempts % 10 === 0) {
          console.log('[Obsidian Init] 编辑器未就绪（第 ' + attempts + '/' + maxAttempts + ' 次），' + delayMs + 'ms 后重试');
        }
        setTimeout(tryFill, delayMs);
      } else {
        const totalTimeMs = 20 * 500 + (maxAttempts - 20) * 1000;
        console.log('[Obsidian Init] ❌ 经过 ' + maxAttempts + ' 次尝试（约 ' + (totalTimeMs / 1000).toFixed(1) + ' 秒）仍未找到编辑器，建议手动复制粘贴或检查浏览器控制台');
      }
    };
    
    // 页面加载完成后开始填充
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryFill);
    } else {
      tryFill();
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
