param(
    [ValidateSet('full', 'api', 'files')]
    [string]$Mode = 'full'
)

$root = $PSScriptRoot
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Location $root

function Stop-PortListener([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Write-Host "  Killing process on port $Port (PID: $($conn.OwningProcess))" -ForegroundColor Gray
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}

$servicePids = @()

function Start-ServiceProcess([string]$Name, [string]$FilePath, [string[]]$Arguments, [int]$Port) {
    $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDir "$Name.out.log") `
        -RedirectStandardError (Join-Path $logDir "$Name.err.log")
    $script:servicePids += $proc.Id

    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
            Write-Host "[OK] $Name listening on port $Port (PID: $($proc.Id))" -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host "[FAIL] $Name not listening on port $Port after 30s. See logs\$Name.err.log and logs\$Name.out.log" -ForegroundColor Red
}

# ============================================================================
# 清理占用的端口
# ============================================================================
Write-Host "Cleaning up ports..." -ForegroundColor Yellow
foreach ($port in @(3001, 3000, 8800)) {
    Stop-PortListener $port
}

Write-Host ""
Write-Host "Starting TableDeconstruction P1 with Doocs Integration..." -ForegroundColor Green

Write-Host "Building..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed; services not started." -ForegroundColor Red
    exit 1
}

# ============================================================================
# 检查并安装 Doocs 依赖
# ============================================================================
Write-Host "Checking Doocs installation..."
$doocsDepsPath = Join-Path $root 'tools\doocs\node_modules'
if (-not (Test-Path $doocsDepsPath)) {
    Write-Host "Installing Doocs dependencies..." -ForegroundColor Yellow
    npm install --prefix tools/doocs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Doocs installation failed, continuing without Doocs..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Doocs dependencies ready" -ForegroundColor Green
}

# ============================================================================
# 启动 Doocs 服务 (端口 8800)
# ============================================================================
if ($Mode -eq 'full') {
    Write-Host "Starting Doocs editor on port 8800 (via proxy server)..."
    Start-ServiceProcess -Name 'Doocs' -FilePath 'node' -Arguments @('tools/doocs/server.js') -Port 8800
}

if ($Mode -eq 'full' -or $Mode -eq 'api') {
    Write-Host "Starting API server on port 3001..."
    Start-ServiceProcess -Name 'API_Server' -FilePath 'npm.cmd' -Arguments @('run', 'start:server') -Port 3001
}

if ($Mode -eq 'full' -or $Mode -eq 'files') {
    Write-Host "Starting file manager on port 3000..."
    Start-ServiceProcess -Name 'FileManager' -FilePath 'npm.cmd' -Arguments @('run', 'start:file-manager') -Port 3000
}

Write-Host ""
Write-Host "Startup finished. Logs: $logDir" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  [DOOCS]   Doocs Editor:    http://127.0.0.1:8800"
Write-Host "  [API]     API Server:      http://127.0.0.1:3001"
Write-Host "  [FILES]   File Manager:    http://127.0.0.1:3000"
Write-Host "  [PANEL]   Control Panel:   file:///$($root.Replace('\', '/'))/P1_CONTROL_PANEL.html"
Write-Host ""
Write-Host "PIDs started by this script: $($servicePids -join ', ')" -ForegroundColor Yellow
Write-Host "To stop: Stop-Process -Id <PID> -Force  (the PIDs above)" -ForegroundColor Yellow

Write-Host "Keeping script alive (Ctrl+C to exit)..."
while ($true) {
    Start-Sleep -Seconds 1
}
