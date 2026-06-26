<#
.SYNOPSIS
  Builds frontend, starts backend, and creates an ngrok tunnel for remote testing.
.DESCRIPTION
  1. Runs 'npm run build' in the frontend directory
  2. Starts ngrok tunnel to http://localhost:5000
  3. Starts the backend server with $env:NGROK_URL set
  4. Backend logs the public URL and serves it via GET /api/config
.PARAMETER ngrokToken
  Optional ngrok authtoken (avoids the interactive login step).
.EXAMPLE
  .\scripts\ngrok-test.ps1
  .\scripts\ngrok-test.ps1 -ngrokToken 2a3b4c5d6e7f
#>
param(
  [string]$ngrokToken = ""
)

$root = Resolve-Path "$PSScriptRoot\..\.."
$backend = "$root\backend"
$frontend = "$root\frontend"
$port = 5000

# ── 1. Build frontend ──────────────────────────────────────────────
Write-Host "`n[1/4] Building frontend..." -ForegroundColor Cyan
Push-Location $frontend
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Frontend build failed. Aborting." -ForegroundColor Red
  Pop-Location; exit 1
}
Pop-Location

# ── 2. Ensure ngrok is installed ───────────────────────────────────
Write-Host "[2/4] Checking ngrok..." -ForegroundColor Cyan
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  Write-Host "ngrok not found. Installing via winget..." -ForegroundColor Yellow
  winget install ngrok
  if ($LASTEXITCODE -ne 0) {
    Write-Host "winget install failed. Try downloading from https://ngrok.com/download" -ForegroundColor Red
    Write-Host "Then re-run this script." -ForegroundColor Red
    exit 1
  }
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:Path"
}

# ── 3. Authenticate ngrok (if token provided) ──────────────────────
if ($ngrokToken) {
  Write-Host "[3/4] Configuring ngrok authtoken..." -ForegroundColor Cyan
  ngrok config add-authtoken $ngrokToken 2>&1 | Out-Null
}

# ── 4. Start ngrok in background ───────────────────────────────────
Write-Host "[4/4] Starting ngrok tunnel to http://localhost:$port ..." -ForegroundColor Cyan
$ngrokJob = Start-Job -ScriptBlock {
  param($p) ngrok http $p --host-header="localhost:$p"
} -ArgumentList $port

Start-Sleep -Seconds 3

# ── 5. Get public URL from ngrok API ──────────────────────────────
$ngrokUrl = $null
try {
  $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
  $ngrokUrl = $tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1 -ExpandProperty public_url
  if (-not $ngrokUrl) {
    $ngrokUrl = $tunnels.tunnels | Select-Object -First 1 -ExpandProperty public_url
  }
} catch {
  Write-Host "Warning: Could not retrieve ngrok URL." -ForegroundColor Yellow
}

if ($ngrokUrl) {
  $env:NGROK_URL = $ngrokUrl
  $env:FRONTEND_URL = $ngrokUrl
  Write-Host "`n🌍 Public URL: $ngrokUrl" -ForegroundColor Green
} else {
  Write-Host "`n⚠️  ngrok URL unknown. Check http://127.0.0.1:4040" -ForegroundColor Yellow
}

# ── 6. Start backend (foreground) ──────────────────────────────────
Write-Host "Starting backend on port $port..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop everything.`n" -ForegroundColor Gray

$env:PORT = $port

try {
  Push-Location $backend
  node index.js
} finally {
  Pop-Location
  Write-Host "`nShutting down ngrok..." -ForegroundColor Cyan
  Stop-Job $ngrokJob -ErrorAction SilentlyContinue
  Remove-Job $ngrokJob -Force -ErrorAction SilentlyContinue
}
