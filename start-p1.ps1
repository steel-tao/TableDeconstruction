param(
    [string]$Mode = 'full'
)

Write-Host "Starting TableDeconstruction P1..."

Write-Host "Building..."
npm run build

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

Write-Host "System started successfully!"
Write-Host "API: http://localhost:3001"
Write-Host "Files: http://localhost:3000"
Write-Host "To stop: Stop-Process -Name node -Force"

Write-Host "Keeping script alive (Ctrl+C to exit)..."
while ($true) {
    Start-Sleep -Seconds 1
}
