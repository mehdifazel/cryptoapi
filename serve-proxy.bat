@echo off
cd /d "%~dp0"
echo Starting server with API proxy (Ramzinex + Wallex)...
echo Open http://localhost:8888/ in your browser
echo Press Ctrl+C to stop
echo.
python scripts/serve_and_proxy.py
if errorlevel 1 (
  echo Python not found or script failed.
  pause
)
