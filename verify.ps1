#!/usr/bin/env pwsh

<#
.SYNOPSIS
    验证系统启动是否正常的测试脚本
    
.DESCRIPTION
    运行启动脚本后，使用此脚本验证所有系统功能是否正常
    
.EXAMPLE
    .\verify.ps1
#>

$ErrorActionPreference = 'SilentlyContinue'

# 颜色定义
$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Info    = 'Cyan'
    Warning = 'Yellow'
}

function Write-Log {
    param([string]$Message, [string]$Type = 'Info')
    Write-Host $Message -ForegroundColor $colors[$Type]
}

function Test-Endpoint {
    param([string]$Url, [string]$Name)
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Log "✓ $Name - OK ($($response.StatusCode))" Success
            return $true
        } else {
            Write-Log "✗ $Name - 异常状态码 ($($response.StatusCode))" Error
            return $false
        }
    } catch {
        Write-Log "✗ $Name - 无法连接" Error
        return $false
    }
}

Write-Log "`n========================================" Info
Write-Log "系统验证脚本" Info
Write-Log "========================================`n" Info

# 检查端口
Write-Log "1. 检查端口连接..." Info

$apiOk = Test-Endpoint "http://localhost:3001/" "API 服务器 (3001)"
$fileOk = Test-Endpoint "http://localhost:3000/" "文件管理器 (3000)"

# 检查 API 功能
if ($apiOk) {
    Write-Log "`n2. 测试 API 功能..." Info
    
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:3001/api/wechat/token" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            if ($data.success -and $data.data.access_token) {
                Write-Log "✓ WeChat Token 获取 - OK" Success
            } else {
                Write-Log "✗ Token 格式异常" Error
            }
        }
    } catch {
        Write-Log "✗ WeChat Token 获取失败" Error
    }
}

# 总结
Write-Log "`n========================================" Info
Write-Log "✅ 验证完成" Success
Write-Log "========================================`n" Info

if ($apiOk -and $fileOk) {
    Write-Log "🎉 系统完全就绪！所有服务正常运行。" Success
} elseif ($apiOk) {
    Write-Log "⚠️  文件管理器未响应，但 API 服务器正常" Warning
} else {
    Write-Log "❌ 系统未正常启动，请检查启动脚本输出" Error
}

Write-Log "`n访问地址：" Info
Write-Log "  • API 文档:        http://localhost:3001" Info
Write-Log "  • 文件管理器:      http://localhost:3000" Info
Write-Log "  • 控制面板:        $($PWD)\CONTROL_PANEL.html" Info

Write-Log "`n"
