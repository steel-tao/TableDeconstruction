#!/usr/bin/env pwsh

<#
.SYNOPSIS
    TableDeconstruction P1 系统启动脚本
    
.DESCRIPTION
    一键启动完整的 WeChat 内容管理与发布系统
    包括 API 服务器、文件管理器和相关服务
    
.PARAMETER Mode
    启动模式：full (完整), api (仅API), files (仅文件管理)
    
.EXAMPLE
    .\start-p1.ps1 -Mode full
    .\start-p1.ps1 -Mode api
#>

param(
    [ValidateSet('full', 'api', 'files')]
    [string]$Mode = 'full'
)

$ErrorActionPreference = 'Stop'

# 颜色定义
$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Info    = 'Cyan'
    Warning = 'Yellow'
}

function Write-Log {
    param([string]$Message, [string]$Type = 'Info')
    $timestamp = Get-Date -Format 'HH:mm:ss'
    Write-Host "[$timestamp] " -NoNewline
    Write-Host $Message -ForegroundColor $colors[$Type]
}

function Test-Port {
    param([int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $Port)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | Get-Unique
        foreach ($pid in $processes) {
            if ($pid) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Log "✓ 已清理端口 $Port 上的进程 (PID: $pid)" Success
            }
        }
    } catch {
        # 忽略错误，可能进程已关闭
    }
}

Write-Log "🚀 TableDeconstruction P1 系统启动器" Info
Write-Log "模式: $Mode" Info

# 检查依赖
Write-Log "📋 检查依赖..." Info
if (-not (Test-Path "package.json")) {
    Write-Log "❌ 未找到 package.json，请在项目根目录运行此脚本" Error
    exit 1
}

# 清理端口
Write-Log "🧹 清理占用的端口..." Info
if ($Mode -eq 'full' -or $Mode -eq 'api') {
    Stop-ProcessOnPort 3001
}
if ($Mode -eq 'full' -or $Mode -eq 'files') {
    Stop-ProcessOnPort 3000
}

# 编译
Write-Log "🔨 编译 TypeScript..." Info
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Log "❌ 编译失败" Error
    exit 1
}
Write-Log "✓ 编译完成" Success

# 启动服务
Write-Log "⏳ 启动服务..." Info

$jobs = @()

# 启动 API 服务器
if ($Mode -eq 'full' -or $Mode -eq 'api') {
    Write-Log "启动 API 服务器 (端口 3001)..." Info
    $apiJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run start:server
    } -Name "API_Server"
    $jobs += $apiJob
    Start-Sleep -Seconds 3
    
    if (Test-Port 3001) {
        Write-Log "✓ API 服务器已启动 → http://localhost:3001" Success
    } else {
        Write-Log "❌ API 服务器启动失败" Error
        exit 1
    }
}

# 启动文件管理器
if ($Mode -eq 'full' -or $Mode -eq 'files') {
    Write-Log "启动文件管理器 (端口 3000)..." Info
    $fileJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run start:file-manager
    } -Name "FileManager"
    $jobs += $fileJob
    Start-Sleep -Seconds 3
    
    if (Test-Port 3000) {
        Write-Log "✓ 文件管理器已启动 → http://localhost:3000" Success
    } else {
        Write-Log "⚠️  文件管理器启动可能需要时间" Warning
    }
}

# 显示信息
Write-Log "`n========================================" Info
Write-Log "✅ 系统启动完成！" Success
Write-Log "========================================`n" Info

Write-Log "📱 访问地址：" Info
Write-Log "  • API 文档:        http://localhost:3001" Info
Write-Log "  • 文件管理器:      http://localhost:3000" Info
Write-Log "  • 控制面板:        $($PWD)\P1_CONTROL_PANEL.html" Info

Write-Log "`n🎯 快速开始：" Info
Write-Log "  1. 打开 P1_CONTROL_PANEL.html 进行操作" Info
Write-Log "  2. 创建发布记录 → 审核 → 批准 → 发布" Info
Write-Log "  3. 或通过文件管理器上传文件" Info

Write-Log "`n📝 停止服务：" Info
Write-Log "  • 按 Ctrl+C 停止脚本" Info
Write-Log "  • 或运行: Stop-Process -Name node -Force" Info

Write-Log "`n========================================`n" Info

# 保持脚本运行
if ($jobs.Count -gt 0) {
    Wait-Job -Job $jobs | Out-Null
}
