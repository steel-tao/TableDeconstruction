#!/usr/bin/env node

/**
 * 代理服务器 - 生产级实现
 * 转发所有请求到 Doocs CLI，提供固定入口
 *
 * @version 1.0.0
 */

import http from 'http';
import httpProxy from 'http-proxy';

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '55885');
const CLI_HOST = process.env.CLI_HOST || '127.0.0.1';
const CLI_PORT = parseInt(process.env.CLI_PORT || '8800');
const TARGET = `http://${CLI_HOST}:${CLI_PORT}`;

// 创建代理
const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true,
  timeout: 30000,
});

// 错误处理
proxy.on('error', (err, req, res) => {
  console.error(`[代理错误] ${req.method} ${req.url}:`, err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Bad Gateway - 后端服务暂不可用',
    message: err.message,
  }));
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  // 添加响应头
  res.setHeader('X-Proxied-By', 'Doocs-Proxy/1.0.0');
  res.setHeader('X-Forwarded-For', req.socket.remoteAddress);
});

// 创建服务器
const server = http.createServer((req, res) => {
  // 记录请求
  console.log(`[${new Date().toLocaleTimeString('zh-CN')}] ${req.method} ${req.url}`);

  // 转发请求
  proxy.web(req, res);
});

// 处理 WebSocket
server.on('upgrade', (req, socket, head) => {
  console.log(`[升级] WebSocket ${req.url}`);
  proxy.ws(req, socket, head);
});

// 启动服务器
server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`✓ 代理服务已启动`);
  console.log(`  监听: http://127.0.0.1:${PROXY_PORT}`);
  console.log(`  转发到: ${TARGET}`);
});

// 错误处理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ 端口 ${PROXY_PORT} 已被占用`);
  } else {
    console.error('✗ 服务器错误:', err.message);
  }
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭代理服务...');
  server.close(() => {
    console.log('代理服务已关闭');
    process.exit(0);
  });
});
