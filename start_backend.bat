@echo off
echo ====================================================
echo Starting Library Statistics Backend (FastAPI)
echo ====================================================
cd /d "%~dp0backend"
"%~dp0.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
