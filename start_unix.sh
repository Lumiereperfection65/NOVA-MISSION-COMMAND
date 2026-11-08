#!/bin/bash
echo "Starting NOVA MISSION COMMAND..."
./venv/bin/uvicorn backend.main:app --app-dir backend --reload --port 8000 &
cd frontend && npm run dev &
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
wait
