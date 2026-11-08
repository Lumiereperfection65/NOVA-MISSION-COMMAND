# NOVA MISSION COMMAND - Windows Start Script
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\uvicorn main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Write-Host "NOVA MISSION COMMAND launched successfully!" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend UI: http://localhost:3000" -ForegroundColor Yellow
