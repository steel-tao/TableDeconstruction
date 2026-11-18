param(
    [string]$Mode = 'full'
)

Write-Host "Starting TableDeconstruction P1 with Doocs Integration..." -ForegroundColor Green

Write-Host "Building..."
npm run build

# ============================================================================
# 检查并安装 Doocs 依赖
# ============================================================================
Write-Host "Checking Doocs installation..."
$doocsDepsPath = "F:\TableDeconstruction\tools\doocs\node_modules"
if (-not (Test-Path $doocsDepsPath)) {
    Write-Host "Installing Doocs dependencies..." -ForegroundColor Yellow
    npm install --prefix tools/doocs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Doocs installation failed, continuing without Doocs..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Doocs dependencies ready" -ForegroundColor Green
}

# ============================================================================
# 启动 Doocs 服务 (端口 8800)
# ============================================================================
if ($Mode -eq 'full') {
    Write-Host "Starting Doocs editor on port 8800..."
    Start-Job -ScriptBlock {
        Set-Location F:\TableDeconstruction\tools\doocs
        node node_modules/@doocs/md-cli/index.js --port 8800
    } -Name "Doocs" | Out-Null
    Start-Sleep -Seconds 3
}

if ($Mode -eq 'full' -or $Mode -eq 'api') {
    Write-Host "Starting API server on port 3001..."
    Start-Job -ScriptBlock {
        Set-Location F:\TableDeconstruction
        npm run start:server
    } -Name "API_Server" | Out-Null
    Start-Sleep -Seconds 2
}

if ($Mode -eq 'full' -or $Mode -eq 'files') {
    Write-Host "Starting file manager on port 3000..."
    Start-Job -ScriptBlock {
        Set-Location F:\TableDeconstruction
        npm run start:file-manager
    } -Name "FileManager" | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host "System started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  📝 Doocs Editor: http://127.0.0.1:8800"
Write-Host "  🔗 API Server: http://127.0.0.1:3001"
Write-Host "  📁 File Manager: http://127.0.0.1:3000"
Write-Host "  🎛️  Control Panel: file:///$((Get-Location).Path)/P1_CONTROL_PANEL.html"
Write-Host ""
Write-Host "To stop: Stop-Process -Name node -Force" -ForegroundColor Yellow

Write-Host "Keeping script alive (Ctrl+C to exit)..."
while ($true) {
    Start-Sleep -Seconds 1
}
