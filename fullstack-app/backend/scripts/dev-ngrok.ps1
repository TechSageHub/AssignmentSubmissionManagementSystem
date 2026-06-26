<#
.SYNOPSIS
  Starts ngrok tunnel alongside the backend dev server (nodemon).
.DESCRIPTION
  1. Ensures ngrok is installed
  2. Launches ngrok in the background on port 5000
  3. Retrieves the public ngrok URL from the local API
  4. Sets $env:NGROK_URL so the backend logs it and serves it via /api/config
  5. Starts nodemon (the dev server) in the foreground
  6. Cleans up ngrok when nodemon exits
.PARAMETER ngrokToken
  Optional ngrok authtoken (avoids the interactive login step).
.PARAMETER port
  Port to tunnel (default: 5000).
.EXAMPLE
  .\scripts\dev-ngrok.ps1
  .\scripts\dev-ngrok.ps1 -ngrokToken 2a3b4c5d6e7f
#>
param(
  [string]$ngrokToken = "",
  [int]$port = 5000
)

$root = Resolve-Path "$PSScriptRoot\.."

# ── 1. Ensure ngrok is installed ───────────────────────────────────
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  Write-Host "ngrok not found. Installing via winget..." -ForegroundColor Yellow
  winget install ngrok
  if ($LASTEXITCODE -ne 0) {
    Write-Host "winget install failed. Try downloading from https://ngrok.com/download" -ForegroundColor Red
    exit 1
  }
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:Path"
}

# ── 2. Authenticate ngrok (if token provided) ──────────────────────
if ($ngrokToken) {
  Write-Host "Configuring ngrok authtoken..." -ForegroundColor Cyan
  ngrok config add-authtoken $ngrokToken 2>&1 | Out-Null
}

# ── 3. Start ngrok in background ──────────────────────────────────
Write-Host "Starting ngrok tunnel to http://localhost:$port ..." -ForegroundColor Cyan
$ngrokJob = Start-Job -ScriptBlock {
  param($p) ngrok http $p --host-header="localhost:$p"
} -ArgumentList $port

Start-Sleep -Seconds 3

# ── 4. Get public URL from ngrok API ──────────────────────────────
$ngrokUrl = $null
try {
  $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
  $ngrokUrl = $tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1 -ExpandProperty public_url
  if (-not $ngrokUrl) {
    $ngrokUrl = $tunnels.tunnels | Select-Object -First 1 -ExpandProperty public_url
  }
} catch {
  Write-Host "Warning: Could not retrieve ngrok URL. Check ngrok dashboard." -ForegroundColor Yellow
}

if ($ngrokUrl) {
  $env:NGROK_URL = $ngrokUrl
  $env:FRONTEND_URL = $ngrokUrl
  Write-Host "`n🌍 Public URL: $ngrokUrl" -ForegroundColor Green
} else {
  Write-Host "`n⚠️  ngrok started but URL unknown. Check http://127.0.0.1:4040" -ForegroundColor Yellow
}

# ── 5. Start nodemon (foreground) ─────────────────────────────────
Write-Host "Starting backend dev server..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop everything.`n" -ForegroundColor Gray

try {
  Push-Location $root
  npx nodemon index.js
} finally {
  Pop-Location
  Write-Host "`nShutting down ngrok..." -ForegroundColor Cyan
  Stop-Job $ngrokJob -ErrorAction SilentlyContinue
  Remove-Job $ngrokJob -Force -ErrorAction SilentlyContinue
}
