# NOVA MISSION COMMAND - Windows Installation Script
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "INSTALLING NOVA MISSION COMMAND (NASA Space Apps 2026)" -ForegroundColor Cyan
Write-Host "Team: Nova Tech Africa" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python 3 is required but not found in PATH." -ForegroundColor Red
    exit 1
}

# Check Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is required but not found in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Installing Backend Dependencies..." -ForegroundColor Green
python -m venv venv
.\venv\Scripts\python -m pip install --upgrade pip
.\venv\Scripts\pip install -r backend/requirements.txt

Write-Host "[2/4] Installing Frontend Dependencies..." -ForegroundColor Green
Set-Location frontend
npm install
Set-Location ..

Write-Host "[3/4] Initializing Database & Demo Data..." -ForegroundColor Green
.\venv\Scripts\python -c "import sqlite3; conn = sqlite3.connect('database/nova.db'); conn.execute('CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY, name TEXT)'); conn.commit(); conn.close(); print('Database initialized successfully.')"

Write-Host "[4/4] Installation Complete successfully!" -ForegroundColor Cyan
Write-Host "Run start_windows.ps1 to launch Nova Mission Command." -ForegroundColor Yellow
