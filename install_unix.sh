#!/bin/bash
echo "=================================================="
echo "INSTALLING NOVA MISSION COMMAND (NASA Space Apps 2026)"
echo "Team: Nova Tech Africa"
echo "=================================================="

if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is required."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required."
    exit 1
fi

echo "[1/4] Setting up Python virtual environment..."
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt

echo "[2/4] Installing Frontend dependencies..."
cd frontend
npm install
cd ..

echo "[3/4] Initializing SQLite Database..."
./venv/bin/python3 -c "import sqlite3; conn = sqlite3.connect('database/nova.db'); conn.execute('CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY, name TEXT)'); conn.commit(); conn.close(); print('Database initialized.')"

echo "[4/4] Installation complete!"
