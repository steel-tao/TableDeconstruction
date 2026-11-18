#!/usr/bin/env pwsh

# 启动所有服务的 PowerShell 脚本
# 需要 PowerShell 5.1+

param(
    [switch]$Help
)

if ($Help) {
    @"
启动 Obsidian-Doocs 集成系统
用法: .\scripts\start-services.ps1

功能:
  - 启动文件管理器 (端口: 3000)
  - 启动 Doocs 编辑器 (端口: 55885)
  - 自动清理占用的端口
  - 保持进程运行

按 Ctrl+C 停止所有服务

"@
    exit 0
}

# 配置
$FM_PORT = 3000
$DOOCS_PORT = 55885
$FM_SCRIPT = "$(Get-Location)\tools\file-manager\start.cjs"
$DOOCS_SCRIPT = "$(Get-Location)\tools\doocs\start.cjs"

$colors = @{
    Reset = "`e[0m"
    Bright = "`e[1m"
    Green = "`e[32m"
    Yellow = "`e[33m"
    Red = "`e[31m"
    Cyan = "`e[36m"
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Color = "Green"
    )
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Kill-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connection) {
            $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Log "清理端口 $Port (PID: $($process.Id))" -Color Yellow
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500
            }
        }
    } catch {
        # 忽略错误
    }
}

function Start-Service {
    param(
        [string]$Name,
        [string]$Script,
        [int]$Port
    )
    
    Write-Log "启动 $Name (端口: $Port)" -Color Cyan
    
    $process = Start-Process `
        -FilePath "node" `
        -ArgumentList $Script `
        -PassThru `
        -NoNewWindow `
        -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Log "✓ $Name 已启动 (PID: $($process.Id))" -Color Green
        return $process
    } else {
        Write-Log "✗ $Name 启动失败" -Color Red
        return $null
    }
}

# 主程序
Write-Host ""
Write-Host "$($colors.Bright)$($colors.Green)🚀 启动 Obsidian-Doocs 集成系统$($colors.Reset)" -NoNewline
Write-Host ""
Write-Host ""

# 清理端口
Write-Log "检查端口..." -Color Cyan
Kill-ProcessOnPort -Port $FM_PORT
Kill-ProcessOnPort -Port $DOOCS_PORT

# 启动服务
Write-Host ""
Write-Log "启动服务..." -Color Cyan
Write-Host ""

$fmProcess = Start-Service -Name "📁 文件管理器" -Script $FM_SCRIPT -Port $FM_PORT
$docsProcess = Start-Service -Name "📝 Doocs 编辑器" -Script $DOOCS_SCRIPT -Port $DOOCS_PORT

# 显示启动信息
Write-Host ""
Write-Host "$($colors.Green)✅ 所有服务已启动$($colors.Reset)"
Write-Host ""
Write-Host "$($colors.Bright)访问地址:$($colors.Reset)"
Write-Host "$($colors.Cyan)  📁 文件管理器: http://127.0.0.1:$FM_PORT$($colors.Reset)"
Write-Host "$($colors.Cyan)  📝 Doocs 编辑器: http://127.0.0.1:$DOOCS_PORT$($colors.Reset)"
Write-Host ""
Write-Host "$($colors.Bright)功能:$($colors.Reset)"
Write-Host "$($colors.Cyan)  1. 打开文件管理器选择 Obsidian 文件$($colors.Reset)"
Write-Host "$($colors.Cyan)  2. 点击 '🚀 打开到 Doocs' 按钮$($colors.Reset)"
Write-Host "$($colors.Cyan)  3. Doocs 会自动填充文件内容$($colors.Reset)"
Write-Host "$($colors.Cyan)  4. 点击 Copy 按钮复制到微信$($colors.Reset)"
Write-Host ""
Write-Host "$($colors.Yellow)按 Ctrl+C 停止所有服务$($colors.Reset)"
Write-Host ""

# 等待进程
if ($fmProcess -and $docsProcess) {
    Wait-Process -Id $fmProcess.Id, $docsProcess.Id -Any
}

Write-Host ""
Write-Host "$($colors.Yellow)🛑 服务已停止$($colors.Reset)"
