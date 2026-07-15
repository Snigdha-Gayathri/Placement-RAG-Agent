@echo off
echo ======================================================
echo Starting Placement RAG Agent (Agentic RAG Platform)
echo ======================================================

echo [1/2] Starting Secure FastAPI Backend on port 8000...
start "Backend (FastAPI)" /MIN cmd /c ".venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

echo [2/2] Starting React Frontend on port 5173...
start "Frontend (Vite)" cmd /c "npx vite --host 127.0.0.1 --port 5173"

echo ======================================================
echo Both servers started!
echo Frontend UI:         http://localhost:5173
echo Backend API / Docs:  http://127.0.0.1:8000/docs
echo ======================================================
