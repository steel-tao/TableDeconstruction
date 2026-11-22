const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Obsidian 文章面板：仅在 8800 顶层页面生效，读取 3000 只读接口的文章，并复制正文到剪贴板供粘贴到 Doocs 编辑器
const obsidianPanelScript = `
<script>
(function() {
  if (window.top !== window) return;
  const API = 'http://127.0.0.1:3000/api/obsidian';
  let files = [];
  let checks = [];
  let selectAllOn = false;

  function el(tag, text, parent) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function fetchJson(url) {
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  const btn = el('button', '导入 Obsidian', document.body);
  btn.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483000;padding:8px 12px;border:1px solid #888;border-radius:6px;background:#fff;color:#222;cursor:pointer;font-size:13px;';

  const panel = el('div', undefined, document.body);
  panel.style.cssText = 'display:none;position:fixed;right:20px;bottom:64px;z-index:2147483000;width:380px;max-height:60vh;overflow:auto;background:#fff;color:#222;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);padding:12px;font-size:13px;';
  const heading = el('div', 'Obsidian 文章导入（桌面解构）', panel);
  heading.style.cssText = 'font-weight:600;margin-bottom:8px;';
  const msg = el('div', '', panel);
  msg.style.cssText = 'color:#666;margin-bottom:8px;min-height:16px;';
  const listBox = el('div', '', panel);
  const bar = el('div', '', panel);
  bar.style.cssText = 'display:flex;gap:8px;margin-top:10px;';
  const btnAll = el('button', '全选', bar);
  const btnCopy = el('button', '复制正文', bar);
  const btnClose = el('button', '关闭', bar);
  [btnAll, btnCopy, btnClose].forEach(function(b) { b.style.cssText = 'padding:4px 10px;cursor:pointer;'; });

  function render() {
    const prev = {};
    checks.forEach(function(c) { prev[c.file.path] = c.cb.checked; });
    listBox.textContent = '';
    checks = [];
    files.forEach(function(file) {
      const row = el('label', undefined, listBox);
      row.style.cssText = 'display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid #eee;';
      const cb = el('input', undefined, row);
      cb.type = 'checkbox';
      cb.checked = prev[file.path] === true;
      const name = el('span', file.title, row);
      name.style.flex = '1';
      name.title = file.path;
      checks.push({ cb: cb, file: file });
    });
    msg.textContent = files.length ? '共 ' + files.length + ' 篇' : '没有找到 .md 文件';
  }

  function loadList() {
    msg.textContent = '读取中...';
    return fetchJson(API + '/list').then(function(data) {
      files = data.files;
      render();
    }).catch(function(err) {
      listBox.textContent = '';
      msg.textContent = '读取失败，请确认 3000 服务已启动（' + err.message + '）';
    });
  }

  btn.onclick = function() {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    if (!open) loadList();
  };
  btnClose.onclick = function() { panel.style.display = 'none'; };
  btnAll.onclick = function() {
    selectAllOn = !selectAllOn;
    checks.forEach(function(c) { c.cb.checked = selectAllOn; });
  };
  btnCopy.onclick = function() {
    const selected = checks.filter(function(c) { return c.cb.checked; }).map(function(c) { return c.file; });
    if (selected.length === 0) { msg.textContent = '请先勾选一篇文章'; return; }
    if (selected.length > 1) { msg.textContent = '一次只能复制一篇，当前勾选了 ' + selected.length + ' 篇'; return; }
    const file = selected[0];
    btnCopy.disabled = true;
    msg.textContent = '读取正文中...';
    fetchJson(API + '/file?path=' + encodeURIComponent(file.path)).then(function(detail) {
      return navigator.clipboard.writeText(detail.content).then(function() {
        msg.textContent = '已复制《' + file.title + '》（' + detail.content.length + ' 字符），请到编辑器中粘贴';
      });
    }).catch(function(err) {
      msg.textContent = '复制失败：' + err.message;
    }).finally(function() {
      btnCopy.disabled = false;
    });
  };
})();
</script>
`;

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
  const PARENT_ORIGIN = 'http://127.0.0.1:3000';
  const CM_SELECTOR = '.cm-editor .cm-content[contenteditable="true"]';
  let gen = 0;
  
  
  const bootToken = ++gen;
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
      if (bootToken !== gen) return;
      if (data.content) {
        console.log('[Obsidian Init] 获取新内容，importId:', data.importId);
        fillEditor(bootToken, data.content);
      } else {
        console.log('[Obsidian Init] 暂存区无新内容');
        waitForEditorThenReady();
      }
    })
    .catch(e => {
      console.log('[Obsidian Init] 读取暂存失败（正常，可能是首次或跨域问题）:', e.message);
      if (bootToken === gen) waitForEditorThenReady();
    });

  window.addEventListener('message', (event) => {
    if (event.origin !== PARENT_ORIGIN || !event.data || event.data.type !== 'obsidian-import') return;
    const token = ++gen;
    window.parent.postMessage({ type: 'obsidian-import-ack', seq: event.data.seq }, PARENT_ORIGIN);
    if (event.data.content) fillEditor(token, event.data.content);
  });
  
  function probeOk(cm, text) {
    const last = text.split('\\n').map(l => l.trim()).filter(Boolean).pop();
    if (!last) return false;
    return cm.textContent.includes(last.slice(-20));
  }
  function writeCM(cm, text) {
    cm.focus();
    const range = document.createRange();
    range.selectNodeContents(cm);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return document.execCommand('insertText', false, text);
  }
  function guardCM(token, text, ticks, stable) {
    if (token !== gen || ticks >= 6 || stable >= 2) return;
    setTimeout(() => {
      if (token !== gen) return;
      const cm = document.querySelector(CM_SELECTOR);
      if (!cm || !cm.isConnected) return;
      const ok = probeOk(cm, text);
      if (!ok) {
        console.log('[Obsidian Init] 内容被覆盖，第 ' + (ticks + 1) + ' 次重写');
        writeCM(cm, text);
      }
      guardCM(token, text, ticks + 1, ok ? stable + 1 : 0);
    }, 500);
  }
  function waitForEditorThenReady() {
    const cm = document.querySelector(CM_SELECTOR);
    if (cm && cm.isConnected) {
      console.log('[Obsidian Init] CM6 已挂载，发送 obsidian-ready');
      window.parent.postMessage({ type: 'obsidian-ready' }, PARENT_ORIGIN);
      return;
    }
    setTimeout(waitForEditorThenReady, 300);
  }

  // 🔧 完整的 fillEditor 实现（支持多种编辑器）
  function fillEditor(token, text) {
    if (!text) {
      console.log('[Obsidian Init] 无导入内容，停止填充');
      return;
    }
    const content = text;
    
    console.log('[Obsidian Init] 开始填充编辑器，内容长度:', content.length);
    
    let attempts = 0;
    const maxAttempts = 50;  // 🔧 最多重试 50 次（25 秒）
    
    const tryFill = () => {
      if (token !== gen) return;
      attempts++;
      if (attempts <= 3 || attempts % 10 === 0) {
        console.log('[Obsidian Init] 第 ' + attempts + '/' + maxAttempts + ' 次尝试查找编辑器，当前内容长度: ' + content.length);
      }
      
      let targetEditor = null;
      
      // 🔧 策略 1a: CodeMirror 6，经输入管线写入以同步编辑器状态
      const cm6Content = document.querySelector(CM_SELECTOR);
      if (cm6Content && cm6Content.isConnected) {
        writeCM(cm6Content, content);
        if (probeOk(cm6Content, content)) {
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
          if (ta.isConnected && ta.style.display !== 'none') {
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
          if (ed.isConnected && ed.style.display !== 'none') {
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
      
      // 成功填充后通知父页面，并启动防覆盖守卫
      if (targetEditor) {
        console.log('[Obsidian Init] ✅✅✅ 内容填充成功，内容长度:', content.length);
        window.parent.postMessage({ type: 'obsidian-ready' }, PARENT_ORIGIN);
        guardCM(token, content, 0, 0);
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
        body = body.replace('</body>', injectedScript + obsidianPanelScript + '</body>');
        
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
  console.log(`   - 从 3000 端口 /api/doocs/import-data 读取导入内容，并接收 obsidian-import 消息`);
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
